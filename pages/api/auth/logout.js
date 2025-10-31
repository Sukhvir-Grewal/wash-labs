import { createLogoutCookie } from '../../../lib/auth';

/**
 * Admin Logout API
 * POST /api/auth/logout
 * 
 * Clears session and removes cookie
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Clear cookie (JWT logout)
    const cookie = createLogoutCookie();
    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({ 
      success: true,
      message: 'Logout successful'
    });
    
  } catch (error) {
    console.error('[auth/logout] error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
