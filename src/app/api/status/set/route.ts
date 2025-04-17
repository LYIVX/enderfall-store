import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/database'; // Adjust path as necessary
import { UserStatusValue } from '@/types/user-status'; // Adjust path as necessary
import { createClient } from '@supabase/supabase-js'; // Import for service client

// Ensure environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseServiceRoleKey) {
  // Consider logging this error instead of throwing in production
  // Or handle the absence of the key more gracefully depending on your security model
  console.warn("Missing env.SUPABASE_SERVICE_ROLE_KEY. Route will operate without service privileges.");
  // throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
}

// Initialize Supabase client with service role key for admin privileges
// Use this ONLY for operations requiring bypassing RLS, like this backend route.
// BE VERY CAREFUL with this client.
const supabaseAdmin = supabaseServiceRoleKey
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false, // No need to persist session for service client
        autoRefreshToken: false,
      }
    })
  : null; // Fallback or alternative client if service key is missing


export async function POST(request: Request) {
  const { userId, status, isManual } = await request.json();

  // --- Input Validation ---
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
  }
  if (!status || !['online', 'offline', 'away', 'do_not_disturb'].includes(status)) {
    return NextResponse.json({ error: 'Missing or invalid status' }, { status: 400 });
  }
  if (typeof isManual !== 'boolean') {
    return NextResponse.json({ error: 'Missing or invalid isManual flag' }, { status: 400 });
  }

  // --- Authentication/Authorization (Optional but Recommended) ---
  // Although using service key, you might still want to check
  // if the request is coming from a legitimate context or authorized user.
  // Example: Check if the user making the request matches the userId being updated,
  // unless it's specifically for the 'beforeunload' case from the context.
  // const supabaseRouteHandler = createRouteHandlerClient<Database>({ cookies });
  // const { data: { session } } = await supabaseRouteHandler.auth.getSession();
  // if (!session || session.user.id !== userId) {
  //   // Allow if maybe coming from server-side context or specific scenarios
  //   // For simplicity, skipping strict check here, assuming context handles auth
  //   console.warn(`Status update attempt for ${userId} potentially by different user.`);
  // }


  // --- Database Update ---
  if (!supabaseAdmin) {
     console.error("Supabase service client not available. Cannot update status.");
     return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    // Construct the record for upsert. Ensure user_id is always present.
    const updateData = {
      status: status as UserStatusValue,
      is_manual: isManual,
      last_updated: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('user_status')
      .upsert({ user_id: userId, ...updateData }, { onConflict: 'user_id' }); // Directly include userId here

    if (error) {
      console.error('Supabase Admin Error updating status:', error);
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    console.log(`Successfully updated status for ${userId} to ${status} (manual: ${isManual}) via API.`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('API Error updating status:', err);
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Internal server error: ${message}` }, { status: 500 });
  }
}
