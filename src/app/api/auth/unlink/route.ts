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
  console.log(`Unlinking ${provider} for user ${userId}`);

  // First, get the current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile:', profileError);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }

  // Check if the provider is linked
  const providerIdField = `${provider}_id` as 'discord_id' | 'google_id';
  if (!profile[providerIdField]) {
    return NextResponse.json(
      { error: `No ${provider} account linked` },
      { status: 400 }
    );
  }

  // Step 1: Get user details with identities using admin API
  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
  
  if (userError) {
    console.error('Error fetching user data:', userError);
    return NextResponse.json(
      { error: 'Failed to fetch user authentication data' },
      { status: 500 }
    );
  }
  
  let authUnlinked = false;

  // Step 2: Find the identity to unlink
  if (userData?.user?.identities) {
    const identity = userData.user.identities.find((i: UserIdentity) => i.provider === provider);
    
    if (identity) {
      console.log(`Found identity to unlink: ${identity.id} (${provider})`);

      // Check if this is the only identity (prevent lockout)
      if (userData.user.identities.length <= 1) {
        console.log(`Cannot unlink the only identity provider. User would be locked out.`);
      } else {
        try {
          // Step 3: Try both unlinking methods
          
          // Method 1: Try RPC function first (if it exists)
          try {
            console.log('Attempting to unlink using RPC function...');
            const { data: rpcData, error: rpcError } = await adminClient.rpc('unlink_identity', {
              user_id: userId,
              identity_provider: provider
            });
            
            if (!rpcError && rpcData?.success) {
              console.log('Successfully unlinked using RPC function:', rpcData);
              authUnlinked = true;
            } else if (rpcError) {
              console.log('RPC function not available or error:', rpcError);
              throw new Error('RPC not available');
            }
          } catch (rpcError) {
            console.log('Falling back to direct DB method');
            
            // Method 2: Attempt direct database operation using service role
            try {
              console.log('Attempting direct database operation...');
              // Direct database operation - delete from auth.identities table
              const { error: deleteError } = await adminClient
                .from('auth.identities')
                .delete()
                .eq('id', identity.id)
                .eq('user_id', userId);
                
              if (deleteError) {
                console.error('Error directly deleting identity:', deleteError);
                console.log('Falling back to profile-only unlinking');
              } else {
                console.log(`Successfully unlinked ${provider} identity from auth`);
                authUnlinked = true;
              }
            } catch (dbError) {
              console.error('Database error during identity deletion:', dbError);
              console.log('Unable to directly access auth tables. Using profile-only unlinking.');
            }
          }
        } catch (error) {
          console.error(`Error during identity unlinking:`, error);
        }
      }
    } else {
      console.log(`No ${provider} identity found for user ${userId}`);
    }
  }
  
  // Step 4: Always update the profile in our database
  console.log(`Removing ${provider} ID from profiles table.`);

  // Update the profile to remove the provider ID
  const updateData = {
    [providerIdField]: null,
    updated_at: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (updateError) {
    console.error(`Error unlinking ${provider} from profile:`, updateError);
    return NextResponse.json(
      { error: `Failed to unlink ${provider} from profile` },
      { status: 500 }
    );
  }

  // Return appropriate message based on what was successful
  if (authUnlinked) {
    return NextResponse.json({
      success: true,
      message: `${provider} account completely unlinked from your profile and authentication.`
    });
  } else {
    return NextResponse.json({
      success: true, 
      message: `${provider} ID removed from profile. Note: You may still be able to login with this provider.`,
      partial: true
    });
  }
} 