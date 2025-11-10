import {
  getSessionToken,
  createSessionToken,
  createSessionCookie,
  verifySession
} from '../../../lib/auth';

/**
 * Token refresh endpoint
 * GET /api/auth/refresh
 * 
 * Validates existing session and issues a new one if valid
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get existing token from cookie
    const currentToken = getSessionToken(req);
    if (!currentToken) {
      return res.status(401).json({ error: 'No session found' });
    }

    // Verify current token
    if (!verifySession(currentToken)) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Create new token
    const newToken = createSessionToken();
    const cookie = createSessionCookie(newToken);
    
    // Set new cookie
    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[auth/refresh] error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}