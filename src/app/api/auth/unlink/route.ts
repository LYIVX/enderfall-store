import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/admin';

// Define types for identities
interface UserIdentity {
  id: string;
  user_id: string;
  identity_data?: any;
  provider: string;
  created_at?: string;
  last_sign_in_at?: string;
}

export async function POST(request: NextRequest) {
  // Log incoming cookies
  const cookieStore = cookies();
  console.log('Cookies received by /api/auth/unlink:', JSON.stringify(cookieStore.getAll(), null, 2));
  
  // Clone the request so we can read the body multiple times if needed
  const requestClone = request.clone();
  
  try {
    // Parse request body
    const body = await request.json();
    const { provider, userId: fallbackUserId } = body;

    // Validate provider
    if (!provider || !['discord', 'google'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "discord" or "google"' },
        { status: 400 }
      );
    }

    console.log(`Processing request to unlink ${provider}`);

    // Get the current user session with proper cookie handling
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get session with better error handling
    const sessionResponse = await supabase.auth.getSession();
    console.log('Session check result in API route:', { sessionResponse, sessionError: JSON.stringify(sessionResponse.error) }); // Log session result

    if (!sessionResponse.data.session || !sessionResponse.data.session.user) {
      console.error('No authenticated session found');
      
      // Try using the service role as a fallback for testing/development
      if (process.env.NODE_ENV === 'development' && fallbackUserId) {
        console.log('Development environment detected. Attempting to proceed with service role...');
        
        console.log(`Using provided userId ${fallbackUserId} for development`);
        
        // Continue with the provided userId for development/testing
        return handleUnlinking(provider, fallbackUserId, supabase, supabaseAdmin);
      }
      
      return NextResponse.json({ error: 'Unauthorized. No valid session found.' }, { status: 401 });
    }

    const userId = sessionResponse.data.session.user.id;
    console.log(`Authenticated user: ${userId}`);
    
    return handleUnlinking(provider, userId, supabase, supabaseAdmin);
    
  } catch (error) {
    console.error('Error in unlink API route:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

async function handleUnlinking(provider: string, userId: string, supabase: any, adminClient: any) {
  console.log(`Handling unlink request for ${provider} user ${userId}`);

  try {
    // 1. Get User Identities (Admin API)
    const { data: identitiesData, error: identitiesError } = await adminClient.auth.admin.getUserById(userId);
    
    if (identitiesError) {
      console.error('Error getting user data:', identitiesError);
      return NextResponse.json({ error: 'Failed to fetch user identities' }, { status: 500 });
    }
    
    if (!identitiesData?.user?.identities) {
      console.error('No identities found for user');
      return NextResponse.json({ error: 'No identities found for user' }, { status: 404 });
    }
    
    const identities = identitiesData.user.identities;
    console.log(`Found ${identities.length} identities for user ${userId}`);
    
    // 2. Prevent account lockout
    if (identities.length < 2) {
      console.error('Cannot unlink the only identity - would cause account lockout');
      return NextResponse.json({
        error: 'Cannot unlink your only login method. This would lock you out of your account.'
      }, { status: 400 });
    }
    
    // 3. Find the target identity
    const targetIdentity = identities.find((identity: UserIdentity) => identity.provider === provider);
    
    if (!targetIdentity) {
      console.error(`No ${provider} identity found for user`);
      return NextResponse.json({ error: `No ${provider} account linked to this user` }, { status: 404 });
    }
    
    console.log(`Found identity to unlink: ${targetIdentity.id} (${provider})`);
    
    // 4. Attempt Unlink - Prioritize Admin SDK
    let authUnlinkSuccess = false;
    let authError = null;

    // Preferred Method: Use adminClient.auth.admin.unlinkIdentity
    if (typeof adminClient.auth.admin.unlinkIdentity === 'function') {
      try {
        console.log('Attempting unlink via adminClient.auth.admin.unlinkIdentity...');
        const { error: unlinkAdminError } = await adminClient.auth.admin.unlinkIdentity({
          identity_id: targetIdentity.id,
          user_id: userId // Include user_id as per potential new API requirements
        });

        if (unlinkAdminError) {
          // Log the full error object for detailed diagnosis
          console.error('adminClient.auth.admin.unlinkIdentity failed:', JSON.stringify(unlinkAdminError, null, 2));
          authError = unlinkAdminError; 
        } else {
          console.log('Successfully unlinked using adminClient.auth.admin.unlinkIdentity');
          authUnlinkSuccess = true;
        }
      } catch (e: any) { // Catch potential exceptions
        console.error('Exception calling adminClient.auth.admin.unlinkIdentity:', e);
        authError = e instanceof Error ? e : new Error(String(e));
      }
    }

    // Fallback Method: Use custom RPC function 'unlink_identity'
    // Ensure the 'unlink_identity' function exists and is correctly defined in your database
    // AND that the SQL migration with qualified user_id has been applied.
    if (!authUnlinkSuccess) {
      console.log("Admin SDK method failed or unavailable. Attempting fallback RPC 'unlink_identity'...");
      try {
        const { data: rpcData, error: rpcError } = await adminClient.rpc('unlink_identity', {
          identity_provider: provider,
          user_id: userId
        });

        if (rpcError) {
          // Log the full RPC error object
          console.error("RPC 'unlink_identity' call returned an error:", JSON.stringify(rpcError, null, 2));
          authError = { 
            message: `RPC unlink_identity error: ${rpcError.message}`,
            details: rpcError.details, 
            code: rpcError.code 
          };
        } else if (rpcData && rpcData.success === false) {
          // Handle cases where the RPC function itself returns success: false
          console.error("RPC 'unlink_identity' function reported failure:", rpcData.message);
          authError = { message: rpcData.message || 'RPC function reported failure.' };
        } else {
          // Check if rpcData indicates success (may vary based on your function's return)
          console.log("RPC 'unlink_identity' succeeded. Response data:", JSON.stringify(rpcData, null, 2));
          authUnlinkSuccess = true; // Assume success if no error and not explicitly failed
        }
      } catch (e: any) { // Catch potential exceptions during RPC call
        console.error("Exception calling RPC 'unlink_identity':", e);
        authError = e instanceof Error ? e : new Error(String(e));
      }
    }

    // 5. Handle Unlink Failure
    if (!authUnlinkSuccess) {
      // Log the captured error before returning the response
      console.error('All auth unlinking methods failed. Final captured error:', JSON.stringify(authError, null, 2));
      const errorMessage = authError?.message || 'Failed to unlink from authentication system';
      const errorDetails = authError?.details ? `Details: ${authError.details}` : '';
      const errorCode = authError?.code ? `Code: ${authError.code}` : '';
      
      return NextResponse.json({
        success: false,
        error: 'Failed to unlink authentication identity.',
        message: `${errorMessage} ${errorDetails} ${errorCode}`.trim(),
        // Note: Client-side unlinking (using supabase.auth.unlinkIdentity) is generally 
        // NOT recommended for security reasons when an admin client is available.
        // If server-side fails, it usually points to a config/permission issue.
      }, { status: 500 }); // Use 500 for server-side failure
    }
    
    // 6. Update Profiles Table (only if auth unlink succeeded)
    console.log('Auth unlinking succeeded! Now updating profiles table.');
    
    const providerIdField = `${provider}_id` as 'discord_id' | 'google_id';
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        [providerIdField]: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error(`Error updating profile:`, updateError);
      // Even though profile update failed, auth unlink succeeded.
      return NextResponse.json({ 
        success: true, // Overall operation partially succeeded
        auth_unlinked: true,
        profile_updated: false,
        message: `${provider} account unlinked from authentication, but there was an error updating your profile.`
      });
    }
    
    console.log(`Successfully updated profile to remove ${provider} ID`);
    
    // 7. Return Success
    return NextResponse.json({
      success: true,
      auth_unlinked: true,
      profile_updated: true,
      message: `${provider} account has been successfully unlinked from your profile.`
    });

  } catch (error) {
    // Catch any unexpected errors in the overall process
    console.error('Critical error in handleUnlinking process:', error);
    return NextResponse.json({ error: 'Server error processing unlinking request.' }, { status: 500 });
  }
}