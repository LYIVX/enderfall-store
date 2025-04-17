import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res });
  
  try {
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
    
    // Set X-Middleware-Request-Id to identify page refreshes vs new navigations
    // This helps client components distinguish between initial load and refresh
    const requestId = crypto.randomUUID();
    res.headers.set('X-Middleware-Request-Id', requestId);
    
    // Let Next.js handle the page routing rather than forcing redirects here
    // This prevents the redirect loop on page refresh
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