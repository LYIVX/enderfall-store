import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create a Supabase client configured to use cookies
  const cookieOptions = {
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  };
  
  const supabase = createMiddlewareClient({ req, res });
  
  try {
    // Check if this is a mobile device using user agent
    const userAgent = req.headers.get('user-agent') || '';
    const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Store the device type in a header and cookie for client access
    res.headers.set('X-Device-Type', isMobileDevice ? 'mobile' : 'desktop');
    
    // Set a device type cookie with long expiration
    res.cookies.set('device_type', isMobileDevice ? 'mobile' : 'desktop', { 
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    // Generate a unique request ID to help track request loops
    const requestId = crypto.randomUUID();
    res.headers.set('X-Middleware-Request-Id', requestId);
    
    // Check if we've seen this request ID before (in the case of a refresh loop)
    const authAttempts = req.cookies.get('auth-attempts')?.value;
    const maxAttempts = 3;
    
    if (isMobileDevice && authAttempts && parseInt(authAttempts) >= maxAttempts) {
      // If we detect a potential loop on mobile, skip session refresh and let the client handle auth
      console.log('Detected potential auth loop on mobile device, skipping middleware auth check');
      res.cookies.set('auth-attempts', '0', { path: '/' });
      return res;
    }
    
    // Refresh the session without redirecting
    const { data: { session } } = await supabase.auth.getSession();
    
    // Set a cookie with the session presence status
    res.cookies.set('has_active_session', session ? 'true' : 'false', {
      path: '/',
      maxAge: 3600, // 1 hour
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    // If on mobile with a session, refresh the token more aggressively
    if (isMobileDevice && session) {
      // Force token refresh on mobile to ensure longer persistence
      try {
        await supabase.auth.refreshSession();
        res.cookies.set('session_refreshed', 'true', { 
          path: '/',
          maxAge: 60, // 1 minute
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      } catch (refreshError) {
        console.error('Error refreshing token in middleware:', refreshError);
      }
    }
    
    // Log for debugging - remove in production
    if (req.nextUrl.pathname.startsWith('/api/checkout')) {
      console.log('Middleware processing checkout API route');
      console.log('Session found in middleware:', !!session);
      if (session) {
        console.log('User ID in middleware:', session.user.id);
      }
    }
    
    // Track authentication attempts for mobile devices to prevent loops
    if (isMobileDevice) {
      const currentAttempts = parseInt(authAttempts || '0');
      res.cookies.set('auth-attempts', (currentAttempts + 1).toString(), { 
        path: '/',
        maxAge: 60 // Reset after 1 minute
      });
    }
  } catch (error) {
    console.error('Error refreshing auth session in middleware:', error);
  }
  
  return res;
}

// Specify which paths should trigger this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 