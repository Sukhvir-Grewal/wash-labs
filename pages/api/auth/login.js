import { 
  verifyAdminPassword, 
  createSessionToken, 
  createSessionCookie
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;
    // Validate input
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Verify password (server-side only)
    const isValid = verifyAdminPassword(password);
    // Generic audit log for login attempt (no password details)
    console.log('[login] Admin login attempt:', isValid ? 'success' : 'failure');

    if (!isValid) {
      // Add delay to prevent brute force attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Create JWT session token
    const token = createSessionToken();
    // Set httpOnly cookie
    const cookie = createSessionCookie(token);
    res.setHeader('Set-Cookie', cookie);
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
