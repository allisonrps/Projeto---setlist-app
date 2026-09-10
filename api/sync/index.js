// In-memory session store (with automatic expiration)
const sessions = new Map();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [key, sess] of sessions.entries()) {
    if (now - sess.createdAt > TTL_MS) {
      sessions.delete(key);
    }
  }
}

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSessionId() {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

module.exports = async function (context, req) {
  cleanExpiredSessions();

  // CORS Headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  };

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers };
    return;
  }

  const action = req.query.action || (req.body && req.body.action) || 'status';

  // 1. CREATE NEW SESSION (Called by Web Editor or Mobile App)
  if (action === 'create_session') {
    const sessionId = generateSessionId();
    let pin = generatePin();
    // Ensure unique PIN
    while (Array.from(sessions.values()).some(s => s.pin === pin)) {
      pin = generatePin();
    }

    const session = {
      id: sessionId,
      pin,
      createdAt: Date.now(),
      status: 'waiting', // 'waiting' | 'ready'
      dataForWeb: null,
      dataForApp: null
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

  // 2. SEND DATA TO SESSION (App -> Web OR Web -> App)
  if (action === 'send_data') {
    const body = req.body || {};
    const sessionId = body.sessionId || req.query.sessionId;
    const pin = body.pin || req.query.pin;
    const target = body.target || 'web'; // 'web' or 'app'
    const payload = body.data;

    let session = null;
    if (sessionId && sessions.has(sessionId)) {
      session = sessions.get(sessionId);
    } else if (pin) {
      session = Array.from(sessions.values()).find(s => s.pin === String(pin).trim());
    }

    if (!session) {
      context.res = {
        status: 404,
        headers,
        body: { success: false, error: 'Sessão ou PIN não encontrado ou expirado.' }
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
    const pin = req.query.pin || (req.body && req.body.pin);
    const receiver = req.query.receiver || (req.body && req.body.receiver) || 'web'; // 'web' or 'app'

    let session = null;
    if (sessionId && sessions.has(sessionId)) {
      session = sessions.get(sessionId);
    } else if (pin) {
      session = Array.from(sessions.values()).find(s => s.pin === String(pin).trim());
    }

    if (!session) {
      context.res = {
        status: 404,
        headers,
        body: { success: false, error: 'Sessão não encontrada.' }
      };
      return;
    }

    if (receiver === 'web' && session.dataForWeb) {
      const data = session.dataForWeb;
      session.dataForWeb = null; // Consume once
      session.status = 'consumed';
      context.res = {
        status: 200,
        headers,
        body: { success: true, status: 'received', data }
      };
      return;
    }

    if (receiver === 'app' && session.dataForApp) {
      const data = session.dataForApp;
      session.dataForApp = null; // Consume once
      session.status = 'consumed';
      context.res = {
        status: 200,
        headers,
        body: { success: true, status: 'received', data }
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

  // DEFAULT / HEALTH CHECK
  context.res = {
    status: 200,
    headers,
    body: {
      success: true,
      service: 'Setlist Band Manager Sync Relay API',
      activeSessions: sessions.size,
      time: new Date().toISOString()
    }
  };
};