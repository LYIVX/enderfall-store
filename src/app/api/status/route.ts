import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { status, userId } = body;
    
    if (!status || !['online', 'do_not_disturb', 'offline'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Use provided userId or try to get from session
    let userIdToUse = userId;
    
    if (!userIdToUse) {
      // Try to get user from session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        userIdToUse = user.id;
      } else {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }
    }

    // Update the user's status
    const { error } = await supabase
      .from('user_status')
      .upsert(
        {
          user_id: userIdToUse,
          status,
          last_updated: new Date().toISOString()
        },
        { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        }
      );

    if (error) {
      console.error('Error updating status:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Error processing status update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Required for Next.js edge runtime
export const dynamic = 'force-dynamic'; 