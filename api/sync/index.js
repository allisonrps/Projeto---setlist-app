const crypto = require('crypto');

// In-memory session store (with automatic expiration)
const sessions = new Map();
const TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SESSIONS = 5000;
const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_ORIGINS = [
  'https://www.setlistbandmanager.com',
  'http://localhost:3000',
  'http://localhost:8081',
  'http://localhost:19006'
];

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [key, sess] of sessions.entries()) {
    if (now - sess.createdAt > TTL_MS) {
      sessions.delete(key);
    }
  }
}

function generatePin() {
  return crypto.randomInt(100000, 1000000).toString();
}

function generateSessionId() {
  return crypto.randomUUID();
}

function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{6}$/.test(pin);
}

function isValidSessionId(sessionId) {
  return typeof sessionId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
}

module.exports = async function (context, req) {
  cleanExpiredSessions();

  const reqHeaders = (req && req.headers) || {};
  const origin = reqHeaders.origin || reqHeaders.Origin || '';
  let allowedOrigin = '';
  if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.azurestaticapps.net') || origin.endsWith('.setlistbandmanager.com')) {
    allowedOrigin = origin;
  } else if (!origin) {
    allowedOrigin = '*';
  }

  // CORS Headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  };

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers };
    return;
  }

  const action = (req.query && req.query.action) || (req.body && req.body.action) || 'status';

  // 1. CREATE NEW SESSION (Called by Web Editor or Mobile App)
  if (action === 'create_session') {
    if (sessions.size >= MAX_SESSIONS) {
      context.res = {
        status: 503,
        headers,
        body: { success: false, error: 'Maximum session limit reached. Please try again later.' }
      };
      return;
    }

    const sessionId = generateSessionId();
    let pin = generatePin();
    let attempts = 0;
    
    // Ensure unique PIN with max 10 attempts
    while (Array.from(sessions.values()).some(s => s.pin === pin)) {
      attempts++;
      if (attempts >= 10) {
        context.res = {
          status: 503,
          headers,
          body: { success: false, error: 'Failed to generate a unique PIN. Please try again.' }
        };
        return;
      }
      pin = generatePin();
    }

    const session = {
      id: sessionId,
      pin,
      createdAt: Date.now(),
      status: 'waiting', // 'waiting' | 'ready'
      dataForWeb: null,
      dataForApp: null,
      failedAttempts: 0
    };

    sessions.set(sessionId, session);

    context.res = {
      status: 200,
      headers,
      body: {
        success: true,
        sessionId,
        pin,
        expiresInSeconds: Math.floor(TTL_MS / 1000)
      }
    };
    return;
  }

  // Helper to find and validate session
  function getSession(reqSessionId, reqPin) {
    let session = null;
    let authFailed = false;

    if (reqSessionId) {
      if (!isValidSessionId(reqSessionId)) return { session: null, authFailed: false };
      session = sessions.get(reqSessionId);
      if (session && reqPin) {
        if (!isValidPin(reqPin) || session.pin !== String(reqPin).trim()) {
           authFailed = true;
        }
        
        if (authFailed) {
          session.failedAttempts = (session.failedAttempts || 0) + 1;
          if (session.failedAttempts >= 5) {
            sessions.delete(reqSessionId);
          }
          return { session: null, authFailed: true };
        }
      }
    } else if (reqPin) {
      if (!isValidPin(reqPin)) return { session: null, authFailed: false };
      session = Array.from(sessions.values()).find(s => s.pin === String(reqPin).trim());
    }

    return { session, authFailed };
  }

  // 2. SEND DATA TO SESSION (App -> Web OR Web -> App)
  if (action === 'send_data') {
    const body = req.body || {};
    const sessionId = body.sessionId || req.query.sessionId;
    let pin = body.pin || req.query.pin;
    if (pin !== undefined) pin = String(pin).trim();
    const target = body.target || 'web'; // 'web' or 'app'
    const payload = body.data;

    if (target !== 'web' && target !== 'app') {
      context.res = { status: 400, headers, body: { success: false, error: 'Invalid target.' } };
      return;
    }

    if (payload && JSON.stringify(payload).length > MAX_PAYLOAD_SIZE) {
      context.res = { status: 413, headers, body: { success: false, error: 'Payload too large.' } };
      return;
    }

    const { session, authFailed } = getSession(sessionId, pin);

    if (!session) {
      context.res = {
        status: authFailed ? 403 : 404,
        headers,
        body: { success: false, error: authFailed ? 'Invalid PIN.' : 'Sessão ou PIN não encontrado ou expirado.' }
      };
      return;
    }

    if (target === 'web') {
      session.dataForWeb = payload;
      session.status = 'data_ready_for_web';
    } else {
      session.dataForApp = payload;
      session.status = 'data_ready_for_app';
    }

    session.updatedAt = Date.now();

    context.res = {
      status: 200,
      headers,
      body: {
        success: true,
        message: 'Dados transmitidos com sucesso para a sessão!',
        sessionId: session.id,
        pin: session.pin
      }
    };
    return;
  }

  // 3. POLL / GET DATA FROM SESSION
  if (action === 'poll_data' || action === 'get_data') {
    const sessionId = req.query.sessionId || (req.body && req.body.sessionId);
    let pin = req.query.pin || (req.body && req.body.pin);
    if (pin !== undefined) pin = String(pin).trim();
    const receiver = req.query.receiver || (req.body && req.body.receiver) || 'web'; // 'web' or 'app'

    if (receiver !== 'web' && receiver !== 'app') {
      context.res = { status: 400, headers, body: { success: false, error: 'Invalid receiver.' } };
      return;
    }

    const { session, authFailed } = getSession(sessionId, pin);

    if (!session) {
      context.res = {
        status: authFailed ? 403 : 404,
        headers,
        body: { success: false, error: authFailed ? 'Invalid PIN.' : 'Sessão não encontrada.' }
      };
      return;
    }

    let payload = null;
    if (receiver === 'web' && session.dataForWeb) {
      payload = session.dataForWeb;
      session.dataForWeb = null;
      session.status = 'consumed';
    } else if (receiver === 'app' && session.dataForApp) {
      payload = session.dataForApp;
      session.dataForApp = null;
      session.status = 'consumed';
    }

    if (payload) {
      session.updatedAt = Date.now();
      context.res = {
        status: 200,
        headers,
        body: { success: true, status: 'received', data: payload }
      };
      return;
    }

    context.res = {
      status: 200,
      headers,
      body: { success: true, status: 'waiting', pin: session.pin }
    };
    return;
  }

  // 4. CHECK SESSION STATUS (e.g. sender checking if data was consumed by recipient)
  if (action === 'status' && (req.query.sessionId || req.query.pin || (req.body && (req.body.sessionId || req.body.pin)))) {
    const sessionId = req.query.sessionId || (req.body && req.body.sessionId);
    let pin = req.query.pin || (req.body && req.body.pin);
    if (pin !== undefined) pin = String(pin).trim();

    const { session, authFailed } = getSession(sessionId, pin);

    if (!session) {
      context.res = {
        status: authFailed ? 403 : 404,
        headers,
        body: { success: false, error: authFailed ? 'Invalid PIN.' : 'Sessão não encontrada.' }
      };
      return;
    }

    const isConsumed = session.status === 'consumed';
    context.res = {
      status: 200,
      headers,
      body: {
        success: true,
        sessionId: session.id,
        pin: session.pin,
        status: session.status,
        consumed: isConsumed,
        hasDataForApp: Boolean(session.dataForApp),
        hasDataForWeb: Boolean(session.dataForWeb)
      }
    };
    return;
  }

  // DEFAULT / HEALTH CHECK
  context.res = {
    status: 200,
    headers,
    body: {
      success: true,
      service: 'Setlist Band Manager Sync Relay API',
      time: new Date().toISOString()
    }
  };
};