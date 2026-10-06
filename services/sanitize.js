/**
 * Sanitização de inputs — Remove scripts maliciosos e caracteres perigosos.
 * 
 * React Native não executa HTML/JS, mas os dados são armazenados no SQLite,
 * enviados ao backend .NET, e podem ser exibidos no Web Editor (SyncModal).
 * Sanitizar na entrada previne ataques XSS stored, SQL injection via strings,
 * e injeção de caracteres de controle.
 */

// Strip HTML tags (including script, iframe, object, embed, etc.)
const HTML_TAG_REGEX = /<\/?[a-z][a-z0-9]*(?:\s[^>]*)?>/gi;

// Dangerous patterns that should never appear in user text inputs
const DANGEROUS_PATTERNS = [
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /on\w+\s*=/gi,        // onclick=, onerror=, onload=, etc.
  /<script[\s>]/gi,
  /<\/script>/gi,
  /<iframe[\s>]/gi,
  /<object[\s>]/gi,
  /<embed[\s>]/gi,
  /<form[\s>]/gi,
  /<input[\s>]/gi,
  /<link[\s>]/gi,
  /<meta[\s>]/gi,
];

/**
 * Sanitiza uma string de texto simples (nomes, títulos, descrições).
 * Remove tags HTML e padrões perigosos.
 * @param {string} input - Texto do usuário
 * @param {number} maxLen - Comprimento máximo (default 500)
 * @returns {string} Texto sanitizado
 */
export function sanitizeText(input, maxLen = 500) {
  if (!input || typeof input !== 'string') return '';
  
  let clean = input;
  
  // Remove HTML tags
  clean = clean.replace(HTML_TAG_REGEX, '');
  
  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, '');
  }
  
  // Remove null bytes and other control characters (keep newlines, tabs for multiline)
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim and enforce max length
  clean = clean.trim().substring(0, maxLen);
  
  return clean;
}

/**
 * Sanitiza texto multiline (letras, cifras, tabs, notas).
 * Preserva newlines e formatação mas remove tags perigosas.
 * @param {string} input - Texto multiline
 * @param {number} maxLen - Comprimento máximo (default 20000)
 * @returns {string} Texto sanitizado
 */
export function sanitizeMultiline(input, maxLen = 20000) {
  if (!input || typeof input !== 'string') return '';
  
  let clean = input;
  
  // Remove HTML tags
  clean = clean.replace(HTML_TAG_REGEX, '');
  
  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, '');
  }
  
  // Remove null bytes (keep newlines, tabs, carriage returns)
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Enforce max length
  return clean.substring(0, maxLen);
}

/**
 * Sanitiza uma URL. Permite apenas http:// e https://.
 * @param {string} url - URL do usuário
 * @returns {string} URL sanitizada ou string vazia se inválida
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  
  const trimmed = url.trim();
  
  // Only allow http and https protocols
  if (!/^https?:\/\//i.test(trimmed)) return '';
  
  // Remove dangerous patterns from URL
  let clean = trimmed;
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, '');
  }
  
  return clean.substring(0, 2000);
}

/**
 * Sanitiza um email.
 * @param {string} email - Email do usuário
 * @returns {string} Email sanitizado (lowercase, trimmed)
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase().substring(0, 255);
}

/**
 * Sanitiza um valor numérico em formato string (cachê, duração, etc).
 * @param {string} value - Valor numérico como string
 * @param {number} maxLen - Comprimento máximo
 * @returns {string} Valor sanitizado
 */
export function sanitizeNumeric(value, maxLen = 20) {
  if (!value || typeof value !== 'string') return '';
  // Allow only digits, dots, commas, colons, dashes, spaces
  return value.replace(/[^0-9.,:\-\s]/g, '').substring(0, maxLen);
}

/**
 * Sanitiza JSON string (cycles, genres, instruments, etc).
 * Tenta parsear para validar, retorna '[]' se inválido.
 * @param {string} jsonStr - JSON como string
 * @param {number} maxLen - Comprimento máximo
 * @returns {string} JSON sanitizado
 */
export function sanitizeJson(jsonStr, maxLen = 5000) {
  if (!jsonStr || typeof jsonStr !== 'string') return '[]';
  
  const trimmed = jsonStr.substring(0, maxLen);
  
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch (e) {
    return '[]';
  }
}
