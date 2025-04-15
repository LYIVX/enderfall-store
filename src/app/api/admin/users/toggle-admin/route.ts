import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Create a Supabase client with the service role key for admin operations
const createServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function POST(req: NextRequest) {
  try {
    // Skip auth check in development for testing
    if (process.env.NODE_ENV === 'development') {
      // Get the request body
      const { userId, isAdmin } = await req.json();
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      // Use the admin client
      const adminSupabase = createServiceRoleClient();
      
      // Update admin status
      const { data, error } = await adminSupabase
        .from('profiles')
        .update({ is_admin: isAdmin })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Error toggling admin status:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        data,
        message: `User admin status updated to ${isAdmin}`
      });
    }
    
    // Production code path with authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session error:', sessionError || 'No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin using the service role client
    const adminSupabase = createServiceRoleClient();
    const { data: currentUser, error: userError } = await adminSupabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();
    
    if (userError || !currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get the request body
    const { userId, isAdmin } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Toggle the admin status
    const { data, error } = await adminSupabase
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error toggling admin status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: `User admin status updated to ${isAdmin}`
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
}

// Required for Next.js edge runtime
export const dynamic = 'force-dynamic'; 