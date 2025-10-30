/**
 * Test endpoint to verify environment variables are loaded
 * DELETE THIS FILE AFTER TESTING
 */
export default function handler(req, res) {
  const hasPassword = !!process.env.ADMIN_PASSWORD;
  const passwordLength = process.env.ADMIN_PASSWORD?.length || 0;
  
  return res.status(200).json({
    hasPassword,
    passwordLength,
    // DO NOT return the actual password
    nodeEnv: process.env.NODE_ENV,
  });
}
