# Security Migration Guide

## Quick Start (5 minutes)

### Step 1: Set Admin Password
Add to your `.env.local` file:

```env
ADMIN_PASSWORD=YourSecurePasswordHere123!
```

**Important**: Choose a strong password (12+ characters, mixed case, numbers, symbols)

### Step 2: Clear Old Authentication
If you were logged in before, clear your browser:
1. Open DevTools (F12)
2. Go to Application/Storage tab
3. Clear localStorage
4. Clear all cookies for localhost

### Step 3: Test Login
1. Start dev server: `npm run dev`
2. Go to `http://localhost:3000/admin`
3. Enter your password from Step 1
4. Should redirect to dashboard

### Step 4: Verify Protection
Try these tests:
- ✅ Access `/adminDashboard` without logging in → should redirect to `/admin`
- ✅ Access `/api/get-bookings` without auth → should return 401
- ✅ Login, then access dashboard → should work
- ✅ Click "Logout" → should redirect to login page

## What Changed?

### Before (INSECURE ❌)
```javascript
// Client-side password in code
const PASSWORD = "Detailing1313!";

// Stored in localStorage (accessible by JavaScript)
localStorage.setItem("adminAuth", PASSWORD);

// No server-side verification
// Anyone could bypass by setting localStorage
```

### After (SECURE ✅)
```javascript
// Password in environment variable
ADMIN_PASSWORD=secret

// Server-side only verification
// httpOnly cookie (not accessible by JavaScript)
// Middleware protection on all routes
// Session tokens
// Server-side rendering with auth checks
```

## Migration Checklist

- [ ] Set `ADMIN_PASSWORD` in `.env.local`
- [ ] Clear browser localStorage and cookies
- [ ] Test login at `/admin`
- [ ] Verify logout button works
- [ ] Test that unauthenticated access is blocked
- [ ] Update production environment variables
- [ ] Remove any old admin password references
- [ ] Test all admin features still work

## Common Issues

### "Can't login with password"
- Check `.env.local` has `ADMIN_PASSWORD` set correctly
- Restart dev server after changing env vars
- Verify no extra spaces in password

### "Infinite redirect"
- Clear all browser cookies for localhost
- Clear localStorage
- Hard refresh (Ctrl+Shift+R)

### "API returns 401"
- Login first at `/admin`
- Check that cookie is set (DevTools → Application → Cookies)
- Verify middleware.js is running

## Deployment to Production

### Vercel
1. Go to your project settings
2. Add environment variable:
   - Name: `ADMIN_PASSWORD`
   - Value: Your strong password
3. Redeploy

### Other Platforms
Add `ADMIN_PASSWORD` to your hosting platform's environment variables section.

## Security Notes

1. **Never commit passwords**: `.env.local` is in `.gitignore`
2. **Use HTTPS in production**: Required for secure cookies
3. **Rotate password**: Change every 90 days
4. **Strong password**: Minimum 12 characters
5. **Monitor access**: Check logs for unauthorized attempts

## Need Help?

Check `SECURITY.md` for comprehensive documentation.

## Rollback (Emergency)

If you need to rollback to old auth (NOT RECOMMENDED):

```bash
git checkout HEAD~1 pages/admin.js
git checkout HEAD~1 pages/adminDashboard.js
git checkout HEAD~1 pages/admin-services.js
# Remove new files
rm lib/auth.js
rm middleware.js
rm pages/api/auth/*.js
```

**Warning**: Old auth is insecure and should not be used in production.
