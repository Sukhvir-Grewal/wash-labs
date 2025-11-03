import { serialize, parse } from 'cookie';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Session configuration
const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set!');
}
const JWT_SECRET = process.env.JWT_SECRET;

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
 * Create a signed JWT for the admin session
 * @returns {string} JWT token
 */
export function createSessionToken() {
  // You can add more claims if needed
  return jwt.sign(
    {
      role: 'admin',
      issuedAt: Date.now(),
    },
    JWT_SECRET,
    { expiresIn: SESSION_MAX_AGE }
  );
}

/**
 * Verify admin password against environment variable
 * @param {string} password - Plain text password to verify
 * @returns {boolean} True if password matches
 */
export function verifyAdminPassword(password) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // Only log missing env, not password details
    console.error('[auth] ADMIN_PASSWORD environment variable not set');
    return false;
  }
  // Direct comparison (you can switch to hashed comparison later if needed)
  return password === adminPassword;
}


/**
 * Create httpOnly session cookie (JWT)
 * @param {string} token - JWT token
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
 * Get session token (JWT) from request cookies
 * @param {object} req - Next.js request object
 * @returns {string|null} JWT token or null
 */
export function getSessionToken(req) {
  const cookies = parse(req.headers.cookie || '');
  return cookies[SESSION_COOKIE_NAME] || null;
}


// --- JWT session helpers ---

/**
 * Verify JWT session token
 * @param {string} token - JWT token
 * @returns {boolean} True if session is valid
 */
export function verifySession(token) {
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Optionally check claims here
    return decoded.role === 'admin';
  } catch (err) {
    return false;
  }
}


/**
 * Middleware helper: verify admin authentication (JWT)
 * @param {object} req - Next.js request object
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated(req) {
  const token = getSessionToken(req);
  return verifySession(token);
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
