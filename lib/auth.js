import { serialize, parse } from 'cookie';
import crypto from 'crypto';

// Session configuration
const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Hash password using PBKDF2 (built-in Node.js crypto, no external deps)
 * @param {string} password - Plain text password
 * @returns {string} Hashed password in format: salt.hash
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}.${hash}`;
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} storedHash - Hash in format: salt.hash
 * @returns {boolean} True if password matches
 */
export function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split('.');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

/**
 * Create session token (random 32 bytes)
 * @returns {string} Session token
 */
export function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify admin password against environment variable
 * @param {string} password - Plain text password to verify
 * @returns {boolean} True if password matches
 */
export function verifyAdminPassword(password) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  console.log('[verifyAdminPassword] Checking password...');
  console.log('[verifyAdminPassword] Env password exists:', !!adminPassword);
  console.log('[verifyAdminPassword] Env password length:', adminPassword?.length || 0);
  console.log('[verifyAdminPassword] Input password length:', password?.length || 0);
  
  if (!adminPassword) {
    console.error('[auth] ADMIN_PASSWORD environment variable not set');
    return false;
  }
  
  // Direct comparison (you can switch to hashed comparison later if needed)
  const isMatch = password === adminPassword;
  console.log('[verifyAdminPassword] Password match:', isMatch);
  return isMatch;
}

/**
 * Create httpOnly session cookie
 * @param {string} token - Session token
 * @returns {string} Serialized cookie header
 */
export function createSessionCookie(token) {
  return serialize(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Create logout cookie (expires immediately)
 * @returns {string} Serialized cookie header
 */
export function createLogoutCookie() {
  return serialize(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Get session token from request cookies
 * @param {object} req - Next.js request object
 * @returns {string|null} Session token or null
 */
export function getSessionToken(req) {
  const cookies = parse(req.headers.cookie || '');
  return cookies[SESSION_COOKIE_NAME] || null;
}

/**
 * Simple session store that persists across Next.js processes
 * Using a global variable that survives hot reloads in development
 * In production, use Redis or a database
 */
const getSessionStore = () => {
  // Use global to persist across hot reloads in development
  if (!global._sessionStore) {
    global._sessionStore = new Map();
  }
  return global._sessionStore;
};

/**
 * Store session token
 * @param {string} token - Session token
 * @param {object} data - Session data
 */
export function storeSession(token, data = {}) {
  const sessions = getSessionStore();
  sessions.set(token, {
    ...data,
    createdAt: Date.now(),
    expiresAt: Date.now() + (SESSION_MAX_AGE * 1000),
  });
  console.log('[storeSession] Session stored. Total sessions:', sessions.size);
}

/**
 * Verify session token
 * @param {string} token - Session token
 * @returns {boolean} True if session is valid
 */
export function verifySession(token) {
  console.log('[verifySession] Verifying token:', token ? `${token.substring(0, 10)}...` : 'No token');
  
  if (!token) {
    console.log('[verifySession] No token provided');
    return false;
  }
  
  const sessions = getSessionStore();
  const session = sessions.get(token);
  console.log('[verifySession] Session found:', !!session);
  console.log('[verifySession] Total sessions stored:', sessions.size);
  
  if (!session) {
    console.log('[verifySession] Session not found in store');
    return false;
  }
  
  // Check if session expired
  const now = Date.now();
  const expired = now > session.expiresAt;
  console.log('[verifySession] Session expired:', expired);
  console.log('[verifySession] Now:', now, 'Expires:', session.expiresAt);
  
  if (expired) {
    sessions.delete(token);
    console.log('[verifySession] Session deleted due to expiration');
    return false;
  }
  
  console.log('[verifySession] Session is valid');
  return true;
}

/**
 * Delete session token
 * @param {string} token - Session token
 */
export function deleteSession(token) {
  const sessions = getSessionStore();
  sessions.delete(token);
  console.log('[deleteSession] Session deleted. Total sessions:', sessions.size);
}

/**
 * Middleware helper: verify admin authentication
 * @param {object} req - Next.js request object
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated(req) {
  console.log('[isAuthenticated] Checking authentication...');
  console.log('[isAuthenticated] Request headers cookie:', req.headers.cookie);
  
  const token = getSessionToken(req);
  console.log('[isAuthenticated] Token found:', token ? `${token.substring(0, 10)}...` : 'No token');
  
  const isValid = verifySession(token);
  console.log('[isAuthenticated] Session valid:', isValid);
  
  return isValid;
}

/**
 * API middleware: require authentication
 * Returns 401 if not authenticated
 * @param {function} handler - API route handler
 * @returns {function} Wrapped handler
 */
export function requireAuth(handler) {
  return async (req, res) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Unauthorized. Please login.' });
    }
    return handler(req, res);
  };
}
