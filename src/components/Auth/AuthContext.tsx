"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { 
  supabase, 
  signInWithDiscord, 
  signInWithGoogle, 
  signOut, 
  getCurrentUser, 
  getCurrentSession,
  updateMinecraftUsername as updateMinecraftUsernameAPI,
  validateMinecraftUsername as validateMinecraftUsernameAPI,
  type Profile 
} from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loginWithDiscord: (redirectPath?: string) => Promise<void>;
  loginWithGoogle: (redirectPath?: string) => Promise<void>;
  logout: (redirectTo?: string) => Promise<void>;
  updateMinecraftUsername: (minecraftUsername: string) => Promise<Profile | null>;
  validateMinecraftUsername: (minecraftUsername: string) => Promise<{ valid: boolean; message: string }>;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  isAdmin: false,
  loginWithDiscord: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  updateMinecraftUsername: async () => null,
  validateMinecraftUsername: async () => ({ valid: false, message: '' }),
  updateProfile: async () => null,
  updatePassword: async () => {},
  clearError: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  // Compute isAuthenticated based on user state
  const isAuthenticated = !!user && !!session;

  // Compute isAdmin based on profile state
  const isAdmin = profile ? (profile as any).is_admin === true : false;

  // Helper to clear error state
  const clearError = () => setError(null);

  // Fetch user profile from Supabase
  const fetchProfile = async (userId: string) => {
    try {
      // Check if we have a cached profile for this user
      if (profile && profile.id === userId) {
        return profile;
      }

      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
        console.log('Error details:', JSON.stringify(error));
        return null;
      }
      
      console.log('Profile fetch result:', data ? 'Success' : 'Not found');
      if (data) {
        console.log('Profile data:', JSON.stringify(data));
      }
      
      return data;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  };

  // Create or update user profile
  const createOrUpdateProfile = async (currentUser: User) => {
    try {
      // Try to fetch existing profile
      let userProfile = await fetchProfile(currentUser.id);
      
      // Extract relevant user metadata
      const userMetadata = currentUser.user_metadata || {};
      const appMetadata = currentUser.app_metadata || {};
      const provider = appMetadata.provider;
      
      console.log('==================== AUTH CONTEXT DEBUG INFO ====================');
      console.log('Auth provider in createOrUpdateProfile:', provider);
      console.log('App metadata:', JSON.stringify(appMetadata, null, 2));
      console.log('User metadata in createOrUpdateProfile:', JSON.stringify(userMetadata, null, 2));
      
      // Extract provider info from identities if available
      let identityProvider = null;
      let identityId = null;
      
      if (currentUser.identities && currentUser.identities.length > 0) {
        // Get the most recent identity
        const latestIdentity = currentUser.identities[currentUser.identities.length - 1];
        identityProvider = latestIdentity.provider;
        identityId = latestIdentity.identity_data?.sub || latestIdentity.id;
        
        console.log('Identity provider:', identityProvider);
        console.log('Identity ID:', identityId);
        console.log('Identity data:', JSON.stringify(latestIdentity.identity_data, null, 2));
      }
      
      // Use the most reliable provider information
      const effectiveProvider = identityProvider || provider || 'unknown';
      console.log('Effective provider:', effectiveProvider);
      console.log('================================================================');
      
      // If no profile exists, create one
      if (!userProfile) {
        console.log('Creating new profile for user:', currentUser.id);
        
        // Construct profile data
        const profileData: Partial<Profile> = {
          id: currentUser.id,
          email: currentUser.email || '',
          username: userMetadata.full_name || 
                   userMetadata.name || 
                   userMetadata.user_name || 
                   userMetadata.preferred_username || 
                   currentUser.email?.split('@')[0] || 
                   `user_${Date.now().toString().slice(-6)}`,
          avatar_url: userMetadata.avatar_url || null,
          minecraft_username: null,
          has_completed_onboarding: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        // Add provider-specific details
        if (effectiveProvider === 'discord') {
          profileData.discord_id = identityId || userMetadata.provider_id || userMetadata.sub;
          console.log(`Setting Discord ID in new profile: ${profileData.discord_id}`);
        } else if (effectiveProvider === 'google') {
          profileData.google_id = identityId || userMetadata.provider_id || userMetadata.sub;
          console.log(`Setting Google ID in new profile: ${profileData.google_id}`);
        }
        
        // Log the profile data we're about to insert
        console.log('Profile data to insert:', JSON.stringify(profileData, null, 2));
        
        // Insert the profile
        const { data, error } = await supabase
          .from('profiles')
          .upsert(profileData)
          .select('*')
          .single();
          
        if (error) {
          console.error('Error creating profile:', error);
          setError(`Failed to create profile: ${error.message}`);
          return null;
        }
        
        console.log('Profile created successfully:', JSON.stringify(data, null, 2));
        return data;
      } else {
        // We have an existing profile, check if we need to update with the current provider ID
        console.log('Existing profile found, checking for updates:', JSON.stringify(userProfile, null, 2));
        
        let needsUpdate = false;
        const updates: Partial<Profile> = {
          updated_at: new Date().toISOString()
        };
        
        // Update email if missing
        if (!userProfile.email && currentUser.email) {
          updates.email = currentUser.email;
          console.log(`Adding email to existing profile: ${updates.email}`);
          needsUpdate = true;
        }
        
        // Add missing provider IDs if the user is authenticating with a new provider
        if (effectiveProvider === 'discord' && !userProfile.discord_id) {
          updates.discord_id = identityId || userMetadata.provider_id || userMetadata.sub;
          console.log(`Adding Discord ID to existing profile: ${updates.discord_id}`);
          needsUpdate = true;
        } else if (effectiveProvider === 'google' && !userProfile.google_id) {
          updates.google_id = identityId || userMetadata.provider_id || userMetadata.sub;
          console.log(`Adding Google ID to existing profile: ${updates.google_id}`);
          needsUpdate = true;
        }
        
        // Update avatar if missing
        if (!userProfile.avatar_url && userMetadata.avatar_url) {
          updates.avatar_url = userMetadata.avatar_url;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          console.log('Updating profile with new data:', JSON.stringify(updates, null, 2));
          
          const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', currentUser.id)
            .select('*')
            .single();
            
          if (error) {
            console.error('Error updating profile:', error);
            return userProfile; // Return original profile even if update fails
          }
          
          console.log('Profile updated successfully:', JSON.stringify(data, null, 2));
          return data;
        }
      }
      
      return userProfile;
    } catch (err) {
      console.error('Error in createOrUpdateProfile:', err);
      setError('Failed to process user profile');
      return null;
    }
  };

  // Initialize authentication state
  useEffect(() => {
    const checkCurrentAuth = async () => {
      try {
        setLoading(true);
        
        // Check if we're on a mobile device using user agent
        const isMobileDevice = typeof window !== 'undefined' && 
          /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          
        // Get device type from middleware headers if available
        const deviceType = document.cookie
          .split('; ')
          .find(row => row.startsWith('X-Device-Type='))
          ?.split('=')[1];
          
        const isDetectedAsMobile = deviceType === 'mobile' || isMobileDevice;
        
        if (isDetectedAsMobile) {
          console.log('Running on mobile device, using optimized auth check strategy');
          
          // Check if we have a successful auth flag from the callback page
          if (localStorage.getItem('auth_session_active') === 'true') {
            console.log('Found active session flag in localStorage for mobile');
            
            // We'll attempt to use the session but won't get stuck in a loop
            // The timeout approach below will still protect us
            localStorage.setItem('auth_retry_count', '0');
          }
          
          // Check for auth errors from callback
          if (localStorage.getItem('auth_error') === 'true') {
            console.log('Found auth error in localStorage, skipping session check');
            setLoading(false);
            setUser(null);
            setSession(null);
            setProfile(null);
            setAuthChecked(true);
            
            // Clear the error after reading it
            localStorage.removeItem('auth_error');
            return;
          }
        }
        
        // Continue with the rest of the auth check logic...
        
        // Check if we've attempted auth too many times
        const authRetryCount = parseInt(localStorage.getItem('auth_retry_count') || '0');
        
        // If we're on mobile and have tried too many times, skip the session check
        if (isDetectedAsMobile && authRetryCount > 5) {
          console.log('Too many auth retries on mobile, skipping supabase session check');
          localStorage.setItem('auth_retry_count', '0');
          setLoading(false);
          setUser(null);
          setSession(null);
          setProfile(null);
          setAuthChecked(true);
          return;
        }
        
        // Increment retry counter
        if (isDetectedAsMobile) {
          localStorage.setItem('auth_retry_count', (authRetryCount + 1).toString());
        }
        
        // Try to get the current session with a timeout for mobile devices
        const sessionPromise = getCurrentSession();
        
        // If on mobile, use a timeout to prevent hanging
        let currentSession: Session | null = null;
        if (isDetectedAsMobile) {
          const timeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Auth session check timed out')), 5000)
          );
          try {
            currentSession = await Promise.race([sessionPromise, timeoutPromise]);
          } catch (error) {
            console.error('Session check timed out or failed:', error);
            setLoading(false);
            setUser(null);
            setSession(null);
            setProfile(null);
            setAuthChecked(true);
            
            // On mobile, if we have an active session flag but couldn't get the session,
            // try refreshing the page once to fix potential cookie issues
            if (isDetectedAsMobile && localStorage.getItem('auth_session_active') === 'true') {
              const refreshCount = parseInt(localStorage.getItem('auth_refresh_count') || '0');
              if (refreshCount < 1) {
                console.log('Mobile session flag active but session check failed, refreshing page');
                localStorage.setItem('auth_refresh_count', '1');
                
                // Force a refresh after a small delay
                setTimeout(() => {
                  window.location.reload();
                }, 500);
              } else {
                // We've already tried refreshing once, clear the flags
                localStorage.removeItem('auth_session_active');
                localStorage.removeItem('auth_refresh_count');
              }
            }
            
            // Reset retry counter after a timeout
            setTimeout(() => {
              localStorage.setItem('auth_retry_count', '0');
            }, 30000);
            return;
          }
        } else {
          currentSession = await sessionPromise;
        }
        
        if (currentSession) {
          console.log('Current auth session found for user:', currentSession.user.id);
          
          // If on mobile, reset the retry counter since we succeeded
          if (isDetectedAsMobile) {
            localStorage.setItem('auth_retry_count', '0');
            localStorage.setItem('auth_session_active', 'true');
            localStorage.setItem('auth_user_id', currentSession.user.id);
            localStorage.removeItem('auth_refresh_count');
          }
          
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Fetch or create profile
          const userProfile = await createOrUpdateProfile(currentSession.user);
          setProfile(userProfile);
        } else {
          console.log('No current auth session found');
          
          // On mobile, check if we thought we had a session before
          if (isDetectedAsMobile && localStorage.getItem('auth_session_active') === 'true') {
            console.log('Mobile device believed session was active but none found');
            localStorage.removeItem('auth_session_active');
          }
          
          setUser(null);
          setSession(null);
          setProfile(null);
        }
        
        setAuthChecked(true);
      } catch (err) {
        console.error('Error checking authentication:', err);
        setError('Failed to check authentication status');
        setUser(null);
        setSession(null);
        setProfile(null);
        setAuthChecked(true);
      } finally {
        setLoading(false);
      }
    };
    
    checkCurrentAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state change event:', event);
        
        if (event === 'SIGNED_IN' && currentSession) {
          setUser(currentSession.user);
          setSession(currentSession);
          
          // If we have a user, fetch or create their profile
          if (currentSession.user) {
            const userProfile = await createOrUpdateProfile(currentSession.user);
            setProfile(userProfile);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setSession(null);
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          setSession(currentSession);
        }
        
        setAuthChecked(true);
        setLoading(false);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Auth methods
  const loginWithDiscord = async (redirectPath = '/profile') => {
    try {
      setError(null);
      setLoading(true);
      await signInWithDiscord(redirectPath);
    } catch (err: any) {
      console.error('Discord login error:', err);
      let errorMessage = 'Failed to login with Discord';
      
      // Provide more user-friendly error messages
      if (err?.message) {
        if (err.message.includes('popup_closed_by_user')) {
          errorMessage = 'Login was cancelled. Please try again.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = `Discord login error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const loginWithGoogle = async (redirectPath = '/profile') => {
    try {
      setError(null);
      setLoading(true);
      await signInWithGoogle(redirectPath);
    } catch (err: any) {
      console.error('Google login error:', err);
      let errorMessage = 'Failed to login with Google';
      
      // Provide more user-friendly error messages
      if (err?.message) {
        if (err.message.includes('popup_closed_by_user')) {
          errorMessage = 'Login was cancelled. Please try again.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = `Google login error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const logout = async (redirectTo?: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Store the current page to redirect back after login
      if (typeof window !== 'undefined' && redirectTo) {
        // Store the page the user was on when they logged out
        localStorage.setItem('auth_redirect_after_login', redirectTo);
      }
      
      // Sign out from Supabase
      await signOut();
      
      // Clear all auth-related state
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Redirect if a redirect path is provided
      if (redirectTo && typeof window !== 'undefined') {
        // Use window.location instead of router to force a full page refresh
        window.location.href = redirectTo;
      }
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(`Failed to logout: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Update the Minecraft username for the current user
  const updateMinecraftUsername = async (minecraftUsername: string): Promise<Profile | null> => {
    try {
      setError(null);
      setLoading(true);
      
      if (!user) {
        throw new Error('You must be logged in to update your Minecraft username');
      }
      
      // Validate the username first
      const validation = await validateMinecraftUsername(minecraftUsername);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
      
      // Update the username in the database
      const updatedProfile = await updateMinecraftUsernameAPI(user.id, minecraftUsername);
      
      if (updatedProfile) {
        setProfile(updatedProfile);
        return updatedProfile;
      }
      
      return null;
    } catch (err: any) {
      console.error('Error updating Minecraft username:', err);
      setError(err.message || 'Failed to update Minecraft username');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Validate Minecraft username
  const validateMinecraftUsername = async (minecraftUsername: string) => {
    try {
      return await validateMinecraftUsernameAPI(minecraftUsername);
    } catch (err: any) {
      console.error('Error validating Minecraft username:', err);
      return { valid: false, message: err.message || 'Failed to validate Minecraft username' };
    }
  };

  // Update user profile
  const updateProfile = async (updates: Partial<Profile>): Promise<Profile | null> => {
    try {
      setError(null);
      setLoading(true);
      
      if (!user) {
        throw new Error('You must be logged in to update your profile');
      }
      
      // If username is being updated, also update the display_name in auth.users
      if (updates.username) {
        const { error: authUpdateError } = await supabase.auth.updateUser({
          data: { display_name: updates.username }
        });
        
        if (authUpdateError) {
          console.error('Error updating display_name in auth.users:', authUpdateError);
          // Continue with profile update even if this fails
        }
      }
      
      // Update the profile in the database
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('*')
        .single();
        
      if (error) {
        throw error;
      }
      
      if (data) {
        setProfile(data);
        return data;
      }
      
      return null;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update user password
  const updatePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      
      if (!user) {
        throw new Error('You must be logged in to update your password');
      }
      
      // Update the password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
      
      // Update the has_password flag in the profile
      await updateProfile({ has_password: true });
    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.message || 'Failed to update password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Inside the AuthProvider component, add a useEffect for token refreshing on mobile
  useEffect(() => {
    // Only run this on mobile devices and when we have a session
    const isMobileDevice = typeof window !== 'undefined' && 
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobileDevice || !session || !user) return;
    
    console.log('Setting up periodic token refresh for mobile device');
    
    // Set up periodic token refresh (every 5 minutes)
    const refreshInterval = setInterval(async () => {
      try {
        console.log('Performing periodic token refresh for mobile');
        
        // Update last interaction time in localStorage
        localStorage.setItem('auth_last_active', Date.now().toString());
        
        // Refresh the token
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('Error refreshing token in interval:', error);
          return;
        }
        
        if (data.session) {
          console.log('Token refreshed successfully');
          setSession(data.session);
          // Update auth_session_active flag
          localStorage.setItem('auth_session_active', 'true');
          localStorage.setItem('auth_session_refreshed', Date.now().toString());
        }
      } catch (err) {
        console.error('Unexpected error during token refresh:', err);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [session, user]);

  // Add Visibility change detection to refresh token when tab becomes visible again on mobile
  useEffect(() => {
    const isMobileDevice = typeof window !== 'undefined' && 
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobileDevice || typeof document === 'undefined') return;
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && session && user) {
        console.log('Tab became visible on mobile, refreshing token');
        try {
          // Check if we should refresh based on time since last refresh
          const lastRefresh = localStorage.getItem('auth_session_refreshed');
          const now = Date.now();
          
          // Only refresh if it's been more than 1 minute since last refresh
          if (!lastRefresh || now - parseInt(lastRefresh) > 60 * 1000) {
            const { data, error } = await supabase.auth.refreshSession();
            
            if (error) {
              console.error('Error refreshing token on visibility change:', error);
              return;
            }
            
            if (data.session) {
              console.log('Token refreshed on visibility change');
              setSession(data.session);
              localStorage.setItem('auth_session_active', 'true');
              localStorage.setItem('auth_session_refreshed', now.toString());
            }
          }
        } catch (err) {
          console.error('Error in visibility change token refresh:', err);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, user]);

  // Add a new useEffect for checking Chrome on mobile authentication issues

  // For Chrome mobile, add extra refresh mechanism
  useEffect(() => {
    // Check if on Chrome mobile
    const isMobileChrome = typeof window !== 'undefined' && 
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) &&
      /Chrome/i.test(navigator.userAgent) && 
      !/Edge|Edg/i.test(navigator.userAgent);
    
    if (!isMobileChrome || !session || !user) return;
    
    console.log('Setting up Chrome mobile-specific session maintenance');
    
    // Special handling for Chrome on mobile - more aggressive token refresh
    const chromeRefreshInterval = setInterval(async () => {
      try {
        console.log('Chrome mobile: Performing aggressive token refresh');
        
        // Add special flag that Chrome mobile session is being maintained
        localStorage.setItem('chrome_mobile_auth_active', 'true');
        localStorage.setItem('chrome_mobile_last_refresh', Date.now().toString());
        
        // Store critical user info in multiple places for Chrome
        localStorage.setItem('chrome_auth_user_id', user.id);
        sessionStorage.setItem('chrome_auth_user_id', user.id);
        document.cookie = `chrome_auth_user_id=${user.id};path=/;max-age=${60*60*24*7};samesite=lax`;
        
        // Special flag that can be checked on page load
        document.cookie = `chrome_mobile_auth_active=true;path=/;max-age=${60*60*24*7};samesite=lax`;
        
        // Use the API endpoint for refreshing - this creates proper cookies
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        
        if (!refreshResponse.ok) {
          throw new Error('Failed to refresh Chrome mobile session');
        }
        
        const refreshData = await refreshResponse.json();
        console.log('Chrome mobile refresh result:', refreshData);
        
        // Only update the session if the API call was successful
        if (refreshData.success) {
          // Force a session refresh through Supabase library as well
          const { data } = await supabase.auth.refreshSession();
          if (data.session) {
            setSession(data.session);
          }
        }
      } catch (err) {
        console.error('Error in Chrome mobile token refresh:', err);
      }
    }, 2 * 60 * 1000); // Every 2 minutes for Chrome mobile
    
    return () => {
      clearInterval(chromeRefreshInterval);
    };
  }, [session, user]);

  // Add another effect to check auth on visibility change for Chrome mobile
  useEffect(() => {
    const isMobileChrome = typeof window !== 'undefined' && 
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) &&
      /Chrome/i.test(navigator.userAgent) && 
      !/Edge|Edg/i.test(navigator.userAgent);
    
    if (!isMobileChrome || typeof document === 'undefined') return;
    
    const handleChromeVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Chrome mobile: Tab became visible, checking auth status');
        
        // Check if we had an active session before
        const hadActiveSession = localStorage.getItem('chrome_mobile_auth_active') === 'true';
        if (hadActiveSession) {
          // We should have a session, let's verify and refresh if needed
          try {
            // Try to get current session
            const { data } = await supabase.auth.getSession();
            
            if (data.session) {
              console.log('Chrome mobile: Session found after visibility change');
              setSession(data.session);
              setUser(data.session.user);
              
              // Also refresh via API for cookie reinforcement
              fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include'
              }).catch(err => console.log('Background refresh error:', err));
            } else if (localStorage.getItem('chrome_auth_user_id')) {
              // We have user ID but no session - try to force reload
              console.log('Chrome mobile: No session but user ID exists, forcing page reload');
              window.location.reload();
            }
          } catch (err) {
            console.error('Error checking Chrome mobile session on visibility change:', err);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleChromeVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleChromeVisibilityChange);
    };
  }, []);

  const value = {
    user,
    profile,
    session,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    loginWithDiscord,
    loginWithGoogle,
    logout,
    updateMinecraftUsername,
    validateMinecraftUsername,
    updateProfile,
    updatePassword,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 