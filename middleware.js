import { NextResponse } from 'next/server';

/**
 * Next.js Middleware to protect admin routes
 * This runs on ALL requests before they reach pages/api
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  
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
    // The actual session verification happens in getServerSideProps or API routes
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

/**
 * Configure which routes this middleware runs on
 */
export const config = {
  matcher: [
    // Admin pages
    '/admin/:path*',
    '/adminDashboard',
    '/admin-services',
    // Admin API routes
    '/api/admin/:path*',
    '/api/get-bookings',
    '/api/update-booking/:path*',
    '/api/delete-booking',
    '/api/expenses',
    '/api/update-booking-status',
    '/api/analytics-:path*',
    '/api/services',
  ],
};
