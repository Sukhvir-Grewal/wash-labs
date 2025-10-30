import { isAuthenticated } from '../../../lib/auth';

/**
 * Check Authentication API
 * GET /api/auth/check
 * 
 * Verify if current session is valid
 */
export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const authenticated = isAuthenticated(req);
    
    if (authenticated) {
      return res.status(200).json({ 
        authenticated: true,
        message: 'Session is valid'
      });
    } else {
      return res.status(401).json({ 
        authenticated: false,
        message: 'Not authenticated'
      });
    }
    
  } catch (error) {
    console.error('[auth/check] error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
