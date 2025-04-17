import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get user agent to detect mobile
    const userAgent = request.headers.get('user-agent') || '';
    const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    console.log('Token refresh API called, mobile:', isMobileDevice);
    
    // Attempt to refresh the session
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Error refreshing session in API:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 401 });
    }
    
    if (!data.session) {
      console.log('No session found to refresh');
      return NextResponse.json({ 
        success: false, 
        error: 'No session found' 
      }, { status: 401 });
    }
    
    // For mobile, set extra cookies to help persistence
    if (isMobileDevice) {
      // These cookies will be accessible to the client
      cookieStore.set('auth_session_active', 'true', {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: false, // Make accessible to JavaScript
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      
      cookieStore.set('auth_user_id', data.session.user.id, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: false, // Make accessible to JavaScript
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      
      cookieStore.set('auth_refresh_time', Date.now().toString(), {
        path: '/',
        maxAge: 3600, // 1 hour
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      userId: data.session.user.id,
      expiresAt: data.session.expires_at
    });
  } catch (error) {
    console.error('Unexpected error in refresh API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Also support GET for easier usage
export async function GET(request: NextRequest) {
  return POST(request);
} 