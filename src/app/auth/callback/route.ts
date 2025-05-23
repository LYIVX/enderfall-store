import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Profile } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/profile';
  
  // Check for direct linking parameters in the callback URL
  const linking = requestUrl.searchParams.get('linking') === 'true';
  const provider = requestUrl.searchParams.get('provider');

  console.log('==== AUTH CALLBACK RECEIVED ====');
  console.log('URL:', request.url);
  console.log('Has code:', !!code);
  console.log('Received redirectTo:', redirectTo);
  console.log('Linking:', linking);
  console.log('Provider:', provider);
  console.log('================================');

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Error during code exchange:', error);
        return NextResponse.redirect(new URL('/login?error=auth', request.url));
      }
      
      const { session } = data;
      
      if (session?.user) {
        const user = session.user;
        const userMetadata = user.user_metadata || {};
        const appMetadata = user.app_metadata || {};
        const authProvider = appMetadata.provider;
        
        console.log('==================== AUTH DEBUG INFO ====================');
        console.log('Auth provider:', authProvider);
        console.log('App metadata:', JSON.stringify(appMetadata, null, 2));
        console.log('User metadata:', JSON.stringify(userMetadata, null, 2));
        console.log('User:', JSON.stringify({
          id: user.id,
          email: user.email,
          phone: user.phone,
          created_at: user.created_at,
          identities: user.identities
        }, null, 2));
        
        // Extract provider info from identities if available
        let identityProvider = null;
        let identityId = null;
        
        if (user.identities && user.identities.length > 0) {
          // Get the most recent identity
          const latestIdentity = user.identities[user.identities.length - 1];
          identityProvider = latestIdentity.provider;
          identityId = latestIdentity.identity_data?.sub || latestIdentity.id;
          
          console.log('Identity provider:', identityProvider);
          console.log('Identity ID:', identityId);
          console.log('Identity data:', JSON.stringify(latestIdentity.identity_data, null, 2));
        }
        
        // Use the most reliable provider information
        const effectiveProvider = identityProvider || authProvider || 'unknown';
        
        // Determine if this is an account linking flow
        // Check both direct parameters and the redirectTo path
        const isRedirectLinking = redirectTo.includes('link=discord') || redirectTo.includes('link=google');
        const isLinking = linking || isRedirectLinking;
        
        // Determine which provider to link
        let linkProvider = provider;
        if (!linkProvider && redirectTo.includes('link=discord')) {
          linkProvider = 'discord';
        } else if (!linkProvider && redirectTo.includes('link=google')) {
          linkProvider = 'google';
        }
        
        console.log('Linking status:', { isLinking, linkProvider, redirectLinking: isRedirectLinking });
        
        if (isLinking && linkProvider && ['discord', 'google'].includes(linkProvider)) {
          // Handle account linking flow
          console.log(`Linking ${linkProvider} account to existing profile`);
          
          // Check if this provider account is already linked to another user
          const { data: existingLinkedProfiles, error: existingProfileError } = await supabase
            .from('profiles')
            .select('id, username')
            .eq(`${linkProvider}_id`, identityId);
            
          if (existingProfileError) {
            console.error('Error checking for existing linked profiles:', existingProfileError);
          } else if (existingLinkedProfiles && existingLinkedProfiles.length > 0) {
            // This provider account is already linked to another user
            const existingProfile = existingLinkedProfiles[0];
            if (existingProfile.id !== user.id) {
              console.error(`This ${linkProvider} account is already linked to user ${existingProfile.id}`);
              return NextResponse.redirect(new URL(`/profile?error=already_linked&provider=${linkProvider}`, request.url));
            }
          }
          
          // Get the existing profile
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (profileError) {
            console.error('Error fetching profile for linking:', profileError);
            return NextResponse.redirect(new URL(`/profile?error=profile_fetch`, request.url));
          }
          
          if (existingProfile) {
            // Update the profile with the linked account info
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                [`${linkProvider}_id`]: identityId,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingProfile.id);
            
            if (updateError) {
              console.error('Error updating profile with linked account:', updateError);
              return NextResponse.redirect(new URL(`/profile?error=link_failed&provider=${linkProvider}`, request.url));
            }
            
            console.log(`Successfully linked ${linkProvider} account to profile ${existingProfile.id}`);
            return NextResponse.redirect(new URL(`/profile?link_success=true&provider=${linkProvider}`, request.url));
          } else {
            console.error('No profile found for linking');
            return NextResponse.redirect(new URL(`/profile?error=no_profile`, request.url));
          }
        } else {
          // Normal authentication flow (not linking)
          // Check if user profile exists
          console.log("Checking for existing profile for user", user.id);
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          // If no existing profile, create one
          if (!existingProfile) {
            console.log('Creating new profile for user:', user.id);
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: user.id,
                  username: user.user_metadata.username || user.user_metadata.full_name || user.email?.split('@')[0] || null,
                  avatar_url: user.user_metadata.avatar_url || null,
                  email: user.email || '',
                  has_completed_onboarding: false,
                  has_password: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ])
              .select()
              .single();
              
            if (createError) {
              console.error('Error creating profile:', createError);
              return NextResponse.redirect(new URL('/login?error=profile_creation', request.url));
            }
            
            console.log('New profile created:', newProfile);
            console.log('Redirecting new user to onboarding page');
            return NextResponse.redirect(new URL('/onboarding', request.url));
          }
          
          // For existing users, check if they've completed onboarding
          if (!existingProfile.has_completed_onboarding) {
            console.log('Existing user has not completed onboarding, redirecting to onboarding page');
            return NextResponse.redirect(new URL('/onboarding', request.url));
          }
          
          // If user has completed onboarding, redirect to requested page or profile
          console.log('User has completed onboarding, redirecting to:', redirectTo);
          console.log('Final redirect URL:', new URL(redirectTo, request.url).toString());
          // Ensure we don't have redirect loops by storing last redirect in session storage
          // This isn't implemented here in server component but client-side should check it
          return NextResponse.redirect(new URL(redirectTo, request.url));
        }
      }
    } catch (error) {
      console.error('Error in auth callback:', error);
      return NextResponse.redirect(new URL('/login?error=unknown', request.url));
    }
  }

  // If no code, redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
} 