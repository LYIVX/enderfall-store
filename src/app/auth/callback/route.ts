import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Profile } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/profile';
  const userAgent = request.headers.get('user-agent') || '';
  const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  console.log('==== AUTH CALLBACK RECEIVED ====');
  console.log('URL:', request.url);
  console.log('Has code:', !!code);
  console.log('Received redirectTo:', redirectTo);
  console.log('Is mobile device:', isMobileDevice);
  console.log('================================');

  // Set a cookie to indicate this is a mobile device
  const cookieStore = cookies();
  if (isMobileDevice) {
    cookieStore.set('is_mobile_device', 'true', { 
      path: '/',
      maxAge: 3600 // 1 hour
    });
  }

  if (code) {
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Error during code exchange:', error);
        
        // Special handling for mobile devices to prevent loops
        if (isMobileDevice) {
          // For mobile devices, use HTML with client-side redirect and cookies
          return new Response(
            `<!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Redirecting...</title>
              <script>
                // Set cookies on the client side
                document.cookie = "mobile_auth_failed=true; path=/; max-age=60";
                document.cookie = "auth_last_error="${encodeURIComponent(error.message)}; path=/; max-age=300";
                
                // Redirect with a small delay to ensure cookies are set
                setTimeout(function() {
                  window.location.href = "/login?mobile_error=auth";
                }, 300);
              </script>
            </head>
            <body>
              <p>Authentication failed. Redirecting to login page...</p>
            </body>
            </html>`,
            {
              status: 200,
              headers: {
                'Content-Type': 'text/html',
              },
            }
          );
        }
        
        return NextResponse.redirect(new URL('/login?error=auth', request.url));
      }
      
      const { session } = data;
      
      if (session?.user) {
        const user = session.user;
        const userMetadata = user.user_metadata || {};
        const appMetadata = user.app_metadata || {};
        const provider = appMetadata.provider;
        
        console.log('==================== AUTH DEBUG INFO ====================');
        console.log('Auth provider:', provider);
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
        const effectiveProvider = identityProvider || provider || 'unknown';
        
        // Check if this is an account linking flow
        const isLinking = requestUrl.searchParams.get('link') === 'true';
        const linkProvider = requestUrl.searchParams.get('provider');
        
        if (isLinking && linkProvider) {
          // Handle account linking flow
          console.log(`Linking ${linkProvider} account to existing profile`);
          
          // Get the existing profile
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (profileError) {
            console.error('Error fetching profile for linking:', profileError);
            return NextResponse.redirect(new URL(`${redirectTo}?error=profile_fetch`, request.url));
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
              return NextResponse.redirect(new URL(`${redirectTo}?error=link_failed`, request.url));
            }
            
            console.log(`Successfully linked ${linkProvider} account to profile ${existingProfile.id}`);
            return NextResponse.redirect(new URL(`${redirectTo}?link_success=true`, request.url));
          } else {
            console.error('No profile found for linking');
            return NextResponse.redirect(new URL(`${redirectTo}?error=no_profile`, request.url));
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
              
              if (isMobileDevice) {
                // For mobile, use direct client redirect
                return new Response(
                  `<!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>Redirecting...</title>
                    <script>
                      document.cookie = "mobile_auth_error=true; path=/; max-age=60";
                      setTimeout(function() {
                        window.location.href = "/login?error=profile_creation";
                      }, 300);
                    </script>
                  </head>
                  <body>
                    <p>Error creating profile. Redirecting...</p>
                  </body>
                  </html>`,
                  {
                    status: 200,
                    headers: {
                      'Content-Type': 'text/html',
                    },
                  }
                );
              }
              
              return NextResponse.redirect(new URL('/login?error=profile_creation', request.url));
            }
            
            console.log('New profile created:', newProfile);
            
            // For mobile devices, use direct client redirect for new users
            if (isMobileDevice) {
              return new Response(
                `<!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>Redirecting...</title>
                  <script>
                    // Store auth data in localStorage for better persistence on mobile
                    localStorage.setItem('new_user_created', 'true');
                    localStorage.setItem('auth_user_id', '${user.id}');
                    localStorage.setItem('auth_session_active', 'true');
                    
                    // Redirect to onboarding
                    setTimeout(function() {
                      window.location.href = "/onboarding";
                    }, 300);
                  </script>
                </head>
                <body>
                  <p>Account created successfully! Redirecting to onboarding...</p>
                </body>
                </html>`,
                {
                  status: 200,
                  headers: {
                    'Content-Type': 'text/html',
                  },
                }
              );
            }
            
            console.log('Redirecting new user to onboarding page');
            return NextResponse.redirect(new URL('/onboarding', request.url));
          }
          
          // For existing users, check if they've completed onboarding
          if (!existingProfile.has_completed_onboarding) {
            console.log('Existing user has not completed onboarding, redirecting to onboarding page');
            
            if (isMobileDevice) {
              return new Response(
                `<!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>Redirecting...</title>
                  <script>
                    // Store auth data in localStorage for better persistence on mobile
                    localStorage.setItem('auth_user_id', '${user.id}');
                    localStorage.setItem('auth_session_active', 'true');
                    
                    // Redirect to onboarding
                    setTimeout(function() {
                      window.location.href = "/onboarding";
                    }, 300);
                  </script>
                </head>
                <body>
                  <p>Authentication successful! Redirecting to complete your profile...</p>
                </body>
                </html>`,
                {
                  status: 200,
                  headers: {
                    'Content-Type': 'text/html',
                  },
                }
              );
            }
            
            return NextResponse.redirect(new URL('/onboarding', request.url));
          }
          
          // If user has completed onboarding, redirect to requested page or profile
          console.log('User has completed onboarding, redirecting to:', redirectTo);
          
          // For mobile, use client-side redirect with localStorage
          if (isMobileDevice) {
            return new Response(
              `<!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Redirecting...</title>
                <script>
                  // Store auth data in localStorage for better persistence on mobile
                  localStorage.setItem('auth_user_id', '${user.id}');
                  localStorage.setItem('auth_session_active', 'true');
                  localStorage.setItem('mobile_auth_success', 'true');
                  
                  // Clear any previous error states
                  localStorage.removeItem('auth_error');
                  localStorage.removeItem('auth_retry_count');
                  
                  // Redirect to the final destination
                  setTimeout(function() {
                    window.location.href = "${redirectTo}";
                  }, 300);
                </script>
              </head>
              <body>
                <p>Login successful! Redirecting...</p>
              </body>
              </html>`,
              {
                status: 200,
                headers: {
                  'Content-Type': 'text/html',
                },
              }
            );
          }
          
          // Redirect to the requested page
          return NextResponse.redirect(new URL(redirectTo, request.url));
        }
      }
    } catch (error) {
      console.error('Error in auth callback:', error);
      
      // Special handling for mobile with client-side redirect
      if (isMobileDevice) {
        return new Response(
          `<!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Authentication Error</title>
            <script>
              // Store error in localStorage
              localStorage.setItem('auth_error', 'true');
              localStorage.setItem('auth_error_message', 'An unexpected error occurred during authentication');
              
              // Redirect to login page
              setTimeout(function() {
                window.location.href = '/login?error=mobile_unknown';
              }, 300);
            </script>
          </head>
          <body>
            <p>Authentication failed. Redirecting to login page...</p>
          </body>
          </html>`,
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
            },
          }
        );
      }
      
      return NextResponse.redirect(new URL('/login?error=unknown', request.url));
    }
  }

  // If no code, redirect to login
  if (isMobileDevice) {
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Redirecting to Login</title>
        <script>
          setTimeout(function() {
            window.location.href = '/login';
          }, 100);
        </script>
      </head>
      <body>
        <p>Redirecting to login page...</p>
      </body>
      </html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
  
  return NextResponse.redirect(new URL('/login', request.url));
} 