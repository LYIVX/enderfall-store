import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res });
  
  try {
    // Check if this is a mobile device using user agent
    const userAgent = req.headers.get('user-agent') || '';
    const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Store the device type in a header that client-side code can read
    res.headers.set('X-Device-Type', isMobileDevice ? 'mobile' : 'desktop');
    
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