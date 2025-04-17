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
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get session with better error handling
    const sessionResponse = await supabase.auth.getSession();
    console.log('Session response:', JSON.stringify({
      status: sessionResponse.error ? 'error' : 'success',
      hasSession: !!sessionResponse.data.session,
      error: sessionResponse.error
    }));

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
    // Get the user's identities to check if unlinking is possible
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
    
    // Prevent account lockout
    if (identities.length < 2) {
      console.error('Cannot unlink the only identity - would cause account lockout');
      return NextResponse.json({
        error: 'Cannot unlink your only login method. This would lock you out of your account.'
      }, { status: 400 });
    }
    
    // Find the specific identity linked to the user
    const targetIdentity = identities.find((identity: UserIdentity) => identity.provider === provider);
    
    if (!targetIdentity) {
      console.error(`No ${provider} identity found for user`);
      return NextResponse.json({ error: `No ${provider} account linked to this user` }, { status: 404 });
    }
    
    console.log(`Found identity to unlink: ${targetIdentity.id} (${provider})`);
    
    // FIRST: Try to unlink the auth identity - critical that this succeeds before updating profiles
    let authUnlinkSuccess = false;
    let authError = null;
    
    // Approach 1: Try with a modified RPC call that avoids the ambiguous column issue
    try {
      console.log('Attempting unlink_identity with explicit parameters to avoid ambiguity');
      
      // Use a modified approach to avoid column ambiguity
      const { data, error } = await adminClient.rpc('execute_sql', {
        sql_query: `
          DO $$
          DECLARE
            target_id TEXT;
            op_success BOOLEAN := FALSE;
          BEGIN
            -- First find the identity ID to avoid ambiguity issues
            SELECT i.id INTO target_id
            FROM auth.identities i
            WHERE i.provider = '${provider}'
            AND i.user_id = '${userId}';
            
            IF target_id IS NULL THEN
              RAISE EXCEPTION 'Identity not found';
            END IF;
            
            -- Now delete by ID to avoid ambiguity
            DELETE FROM auth.identities
            WHERE id = target_id;
            
            op_success := TRUE;
            
            -- Return result
            RAISE NOTICE 'Operation result: %', op_success;
          END
          $$;
        `
      });
      
      if (error) {
        console.error('SQL execution failed:', error);
        authError = error;
      } else {
        console.log('SQL execution may have succeeded');
        
        // Verify if the identity was actually deleted
        const { data: verifyData, error: verifyError } = await adminClient.auth.admin.getUserById(userId);
        
        if (verifyError) {
          console.error('Error verifying unlinking:', verifyError);
        } else if (verifyData?.user?.identities) {
          const stillExists = verifyData.user.identities.some(
            (identity: UserIdentity) => identity.provider === provider
          );
          
          if (stillExists) {
            console.error('Identity still exists after unlinking attempt');
          } else {
            console.log('Successfully verified identity was unlinked!');
            authUnlinkSuccess = true;
          }
        }
      }
    } catch (e) {
      console.error('Error with SQL execution:', e);
      authError = e;
    }
    
    // Approach 2: Try using auth.admin functions if available
    if (!authUnlinkSuccess && typeof adminClient.auth.admin.unlinkIdentity === 'function') {
      try {
        console.log('Trying auth.admin.unlinkIdentity method');
        
        const { error } = await adminClient.auth.admin.unlinkIdentity(userId, {
          identityId: targetIdentity.id
        });
        
        if (error) {
          console.error('Admin unlinkIdentity failed:', error);
          authError = error;
        } else {
          console.log('Successfully unlinked using admin.unlinkIdentity');
          authUnlinkSuccess = true;
        }
      } catch (e) {
        console.error('Error with admin.unlinkIdentity:', e);
        authError = e;
      }
    }
    
    // If auth unlinking failed, return an error without updating profiles
    if (!authUnlinkSuccess) {
      console.error('Failed to unlink auth identity');
      return NextResponse.json({
        success: false,
        error: 'Failed to unlink from authentication system',
        message: authError?.message || 'Unknown error',
        need_client_unlinking: true,
        frontend_code: `
        // IMPORTANT: Since server-side unlinking failed, you must run this code on the client
        import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
        
        async function completeUnlinking() {
          try {
            const supabase = createClientComponentClient();
            
            // First get user identities
            const { data, error } = await supabase.auth.getUserIdentities();
            
            if (error) {
              console.error('Error getting identities:', error);
              return false;
            }
            
            if (!data || !data.identities) {
              console.error('No identities found');
              return false;
            }
            
            // Find the ${provider} identity
            const identity = data.identities.find(i => i.provider === '${provider}');
            
            if (!identity) {
              console.log('${provider} identity not found - might already be unlinked');
              return true;
            }
            
            // Unlink the identity
            const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);
            
            if (unlinkError) {
              console.error('Error unlinking identity:', unlinkError);
              return false;
            }
            
            console.log('Successfully unlinked ${provider} identity!');
            
            // After successful unlinking, update the profile in the database
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                ${provider}_id: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', '${userId}');
              
            if (updateError) {
              console.error('Error updating profile:', updateError);
            }
            
            return true;
          } catch (e) {
            console.error('Error in completeUnlinking:', e);
            return false;
          }
        }
        `
      });
    }
    
    // If auth unlinking succeeded, now update the profiles table
    console.log('Auth unlinking succeeded! Now updating profiles table');
    
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
      return NextResponse.json({ 
        success: true, 
        auth_unlinked: true,
        profile_updated: false,
        message: `${provider} account unlinked from authentication, but there was an error updating your profile.`
      });
    }
    
    console.log(`Successfully updated profile to remove ${provider} ID`);
    
    return NextResponse.json({
      success: true,
      auth_unlinked: true,
      profile_updated: true,
      message: `${provider} account has been successfully unlinked from your profile.`
    });
  } catch (error) {
    console.error('Error in unlinking process:', error);
    return NextResponse.json({ error: 'Failed to process unlinking request' }, { status: 500 });
  }
}