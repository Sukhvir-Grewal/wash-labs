import { 
  verifyAdminPassword, 
  createSessionToken, 
  createSessionCookie, 
  storeSession 
} from '../../../lib/auth';

/**
 * Admin Login API
 * POST /api/auth/login
 * 
 * Server-side password verification only
 * Sets httpOnly session cookie on success
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    console.log('[login] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { password } = req.body;
    console.log('[login] Received login request');
    console.log('[login] Password received:', password ? 'Yes' : 'No');
    console.log('[login] Password length:', password?.length || 0);
    
    // Validate input
    if (!password || typeof password !== 'string') {
      console.log('[login] Invalid password input');
      return res.status(400).json({ error: 'Password is required' });
    }
    
    // Verify password (server-side only)
    const isValid = verifyAdminPassword(password);
    console.log('[login] Password verification result:', isValid);
    
    if (!isValid) {
      console.log('[login] Invalid password attempt');
      // Add delay to prevent brute force attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Create session token
    const token = createSessionToken();
    console.log('[login] Session token created:', token.substring(0, 10) + '...');
    
    // Store session (in-memory for now, use Redis/DB in production)
    storeSession(token, {
      role: 'admin',
      loginAt: new Date().toISOString(),
    });
    console.log('[login] Session stored');
    
    // Set httpOnly cookie
    const cookie = createSessionCookie(token);
    res.setHeader('Set-Cookie', cookie);
    console.log('[login] Cookie set');
    
    // Return success (DO NOT send token to client)
    return res.status(200).json({ 
      success: true,
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('[auth/login] error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
