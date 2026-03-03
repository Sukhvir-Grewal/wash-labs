import { NextResponse } from 'next/server';

/**
 * Next.js Middleware
 * - Maintenance mode: temporarily rewrite all routes to /maintenance (except static assets)
 * - Admin route protection (original behavior)
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1) Maintenance mode — TEMPORARY toggle
  const MAINTENANCE = true; // set to false or remove when done
  if (MAINTENANCE) {
    const isAsset = pathname.startsWith('/_next')
      || pathname.startsWith('/favicon')
      || pathname.startsWith('/site.webmanifest')
      || pathname.startsWith('/images')
      || pathname.startsWith('/videos');
    const isMaintenancePage = pathname === '/maintenance';

    if (!isAsset && !isMaintenancePage) {
      const url = request.nextUrl.clone();
      url.pathname = '/maintenance';
      return NextResponse.rewrite(url);
    }
  }
  
  // 2) Admin protection (kept as-is)
  // Define protected admin routes
  const isAdminPage = pathname.startsWith('/admin') || pathname === '/admin-services' || pathname === '/adminDashboard';
  const isAdminApi = pathname.startsWith('/api/admin') || 
    pathname.startsWith('/api/get-bookings') ||
    pathname.startsWith('/api/update-booking') ||
    pathname.startsWith('/api/delete-booking') ||
    pathname.startsWith('/api/expenses') ||
    pathname.startsWith('/api/update-booking-status') ||
    pathname.startsWith('/api/analytics-') ||
    (pathname.startsWith('/api/services') && request.method === 'PUT');
  
  // Allow login page and auth APIs
  if (pathname === '/admin' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }
  
  // Check authentication for admin routes
  if (isAdminPage || isAdminApi) {
    const token = request.cookies.get('admin_session')?.value;
    
    // If no token, redirect to login
    if (!token) {
      // Redirect pages to login
      if (isAdminPage) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }
      
      // Return 401 for API routes
      if (isAdminApi) {
        return NextResponse.json(
          { error: 'Unauthorized. Please login.' },
          { status: 401 }
        );
      }
    }
    
    // If token exists, allow the request to continue
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

/**
 * Run on all routes while maintenance is enabled
 */
export const config = {
  matcher: ['/:path*'],
};
