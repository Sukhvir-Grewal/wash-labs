# Admin Security Implementation

## Overview

This document describes the comprehensive security implementation for the admin dashboard and all admin-related features in this Next.js application.

## Security Features Implemented

### 1. Server-Side Authentication
- ✅ **No client-side password validation** - All authentication happens server-side only
- ✅ **httpOnly cookies** - Session tokens stored in httpOnly cookies (not accessible via JavaScript)
- ✅ **Secure cookies** - Set to `secure: true` in production (HTTPS only)
- ✅ **SameSite: strict** - Prevents CSRF attacks
- ✅ **Environment variable password** - Admin password stored in `ADMIN_PASSWORD` env var
- ✅ **Session expiration** - Sessions expire after 7 days

### 2. Route Protection
- ✅ **Middleware protection** - All admin routes protected at edge via `middleware.js`
- ✅ **Server-side props** - Admin pages use `getServerSideProps` for double verification
- ✅ **API route protection** - All admin APIs wrapped with `requireAuth()` middleware
- ✅ **Automatic redirects** - Unauthenticated users redirected to login page

### 3. Protected Routes

#### Admin Pages
- `/admin` - Login page (public)
- `/adminDashboard` - Main admin dashboard (protected)
- `/admin-services` - Services editor (protected)

#### Admin API Routes
- `/api/auth/login` - Login endpoint (public)
- `/api/auth/logout` - Logout endpoint (public)
- `/api/auth/check` - Session verification (public)
- `/api/get-bookings` - Get all bookings (protected)
- `/api/update-booking` - Update booking (protected)
- `/api/delete-booking` - Delete booking (protected)
- `/api/expenses` - Manage expenses (protected)
- `/api/update-booking-status` - Update booking status (protected)
- `/api/admin-add-booking` - Add booking from admin (protected)
- `/api/services` - GET is public, PUT is protected

### 4. Data Security
- ✅ **No environment variables exposed** - MongoDB URI, passwords never sent to client
- ✅ **No internal data leaks** - Admin data only fetched server-side
- ✅ **No static pre-rendering** - Admin pages are SSR only (not statically generated)
- ✅ **Session tokens** - Random 32-byte hex tokens (crypto.randomBytes)
- ✅ **In-memory session store** - For development (use Redis/DB in production)

### 5. Attack Prevention
- ✅ **Brute force protection** - 1-second delay on failed login attempts
- ✅ **No password in response** - Login API never returns password or token to client
- ✅ **CSRF protection** - SameSite: strict cookies
- ✅ **XSS protection** - httpOnly cookies prevent JavaScript access
- ✅ **No admin hints** - Login errors don't reveal if user exists

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT REQUEST                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE.JS (EDGE)                     │
│  • Check if route is protected                              │
│  • Verify admin_session cookie exists                       │
│  • Redirect to /admin if missing                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              getServerSideProps (SSR Pages)                 │
│  • Double-check authentication                              │
│  • Verify session token validity                            │
│  • Return 307 redirect if invalid                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  requireAuth() (API Routes)                 │
│  • Verify session token from cookie                         │
│  • Return 401 if invalid                                    │
│  • Execute handler if valid                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     PROTECTED CONTENT                       │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
washlabs/
├── lib/
│   └── auth.js                    # Authentication utilities
├── middleware.js                  # Edge middleware (route protection)
├── pages/
│   ├── admin.js                   # Login page (updated to use API)
│   ├── adminDashboard.js          # Protected with getServerSideProps
│   ├── admin-services.js          # Protected with getServerSideProps
│   └── api/
│       ├── auth/
│       │   ├── login.js           # Server-side login
│       │   ├── logout.js          # Session destruction
│       │   └── check.js           # Session verification
│       ├── get-bookings.js        # Protected with requireAuth
│       ├── update-booking.js      # Protected with requireAuth
│       ├── delete-booking.js      # Protected with requireAuth
│       ├── expenses.js            # Protected with requireAuth
│       ├── update-booking-status.js # Protected with requireAuth
│       ├── admin-add-booking.js   # Protected with requireAuth
│       └── services.js            # PUT protected, GET public
└── .env.example                   # Environment variables template
```

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set your admin password (minimum 12 characters recommended):

```env
ADMIN_PASSWORD=YourSecurePasswordHere123!
```

### 2. Production Deployment

When deploying to production (Vercel, etc.):

1. Add `ADMIN_PASSWORD` to environment variables in your hosting dashboard
2. Ensure `NODE_ENV=production` is set
3. Verify HTTPS is enabled (required for secure cookies)
4. Consider using Redis or database for session storage (instead of in-memory)

### 3. Testing Authentication

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000/admin`
3. Enter your admin password
4. You should be redirected to `/adminDashboard`
5. Try accessing `/adminDashboard` without logging in - should redirect to `/admin`
6. Try accessing `/api/get-bookings` without authentication - should return 401

## Session Management

### Login Flow
1. User submits password to `/api/auth/login`
2. Server verifies password against `ADMIN_PASSWORD` env var
3. Server creates random session token (32 bytes)
4. Server stores session in memory with expiration time
5. Server sets httpOnly cookie with session token
6. Client redirected to `/adminDashboard`

### Session Verification
1. Client makes request to protected route
2. Middleware extracts `admin_session` cookie
3. Middleware verifies token exists in session store
4. Middleware checks token hasn't expired
5. Request proceeds if valid, otherwise redirected/401

### Logout Flow
1. User clicks "Logout" button
2. Client calls `/api/auth/logout`
3. Server deletes session from store
4. Server clears cookie (maxAge: 0)
5. Client redirected to `/admin`

## Security Best Practices

### ✅ DO
- Use a strong admin password (12+ characters, mixed case, numbers, symbols)
- Rotate password regularly (every 90 days)
- Use HTTPS in production
- Keep dependencies updated
- Monitor failed login attempts
- Use Redis or database for sessions in production
- Enable rate limiting on login endpoint
- Add IP allowlisting if admin access is from known IPs

### ❌ DON'T
- Never commit `.env.local` or `.env` to git
- Never hardcode passwords in code
- Never log sensitive data (passwords, session tokens)
- Never send passwords or tokens to client
- Don't use localStorage for authentication
- Don't skip HTTPS in production
- Don't reuse passwords across services

## Production Improvements (Optional)

### 1. Redis Session Store
Replace in-memory sessions with Redis:

```javascript
// lib/auth.js
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function storeSession(token, data) {
  await redis.setex(
    `session:${token}`,
    SESSION_MAX_AGE,
    JSON.stringify(data)
  );
}

export async function verifySession(token) {
  const data = await redis.get(`session:${token}`);
  return !!data;
}
```

### 2. Rate Limiting
Add rate limiting to prevent brute force:

```javascript
// lib/rateLimit.js
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});
```

### 3. Two-Factor Authentication
Add TOTP-based 2FA using libraries like `speakeasy` or `otpauth`.

### 4. Audit Logging
Log all admin actions:

```javascript
// lib/audit.js
export function logAdminAction(action, userId, metadata) {
  // Log to database or monitoring service
  console.log({
    timestamp: new Date().toISOString(),
    action,
    userId,
    metadata
  });
}
```

## Troubleshooting

### Issue: "Unauthorized" on admin pages
- Check that `ADMIN_PASSWORD` is set in environment variables
- Clear browser cookies and login again
- Verify middleware.js is being executed
- Check browser console for errors

### Issue: Infinite redirect loop
- Clear browser cookies
- Check middleware.js matcher configuration
- Verify getServerSideProps is not redirecting incorrectly

### Issue: Session expires too quickly
- Increase `SESSION_MAX_AGE` in lib/auth.js
- Check system time is correct
- Verify session store is working

### Issue: Can't login with correct password
- Verify `ADMIN_PASSWORD` environment variable matches
- Check for whitespace in password
- Look for errors in server logs
- Test with a simple password first

## Monitoring

Monitor these metrics:
- Failed login attempts
- Active sessions count
- Session expiration rate
- API 401 errors
- Admin page access patterns

## License

This security implementation is part of the WashLabs application.

## Support

For security issues or questions, contact the development team.

**IMPORTANT**: Never post passwords, tokens, or sensitive data in public issues or discussions.
