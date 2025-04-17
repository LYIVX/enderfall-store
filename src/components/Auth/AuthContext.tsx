"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  supabase: any;
  user: User | null;
  profile: Profile | null;
  session: Session | null;
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
  isLoading: boolean;
  fetchProfile: (userId: string) => Promise<Profile | null>;
};

const AuthContext = createContext<AuthContextType>({
  supabase: null,
  user: null,
  profile: null,
  session: null,
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
  clearError: () => {},
  isLoading: true,
  fetchProfile: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const router = useRouter();

  // Compute isAuthenticated based on user state
  const isAuthenticated = !!user && !!session;

  // Compute isAdmin based on profile state
  const isAdmin = profile ? (profile as any).is_admin === true : false;

  // Helper to clear error state
  const clearError = () => setError(null);

  // Fetch user profile from Supabase
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('fetchProfile: Starting for user:', userId); // Log start
    if (!supabase || !userId) {
        console.log('fetchProfile: Exiting early - no supabase client or userId.');
        return null;
    }
    try {
      console.log('fetchProfile: Executing Supabase select...'); // Log before DB call
      const { data, error, status } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          username,
          avatar_url,
          created_at,
          updated_at,
          has_completed_onboarding,
          google_id,
          discord_id,
          minecraft_username,
          minecraft_uuid
        `) // Removed '*' and specified columns
        .eq('id', userId)
        .single();

      console.log('fetchProfile: Supabase select finished. Status:', status, 'Error:', error, 'Data:', data ? 'Exists' : 'null'); // Log after DB call & data status

      if (error && status !== 406) { // 406: 'Not Found' - Normal if profile doesn't exist yet
        console.error('Error fetching profile:', error);
        setError('Could not fetch user profile.');
        return null;
      }
      console.log('fetchProfile: Returning data:', data ? 'Profile data' : 'null'); // Log return
      console.log('fetchProfile: Data object BEFORE return:', JSON.stringify(data)); // Log detailed data
      return data as Profile | null;
    } catch (err: any) {
      console.error('Error in fetchProfile catch block:', err);
      setError(`An unexpected error occurred while fetching the profile: ${err.message}`);
      return null;
    } finally {
        console.log('fetchProfile: Finished for user:', userId); // Log finish
    }
  }, [supabase]); // Dependency on supabase client

  // Create or update user profile
  const createOrUpdateProfile = useCallback(async (currentUser: User): Promise<Profile | null> => {
    console.log('createOrUpdateProfile: Starting for user:', currentUser.id); // Log start
    if (!supabase) {
      console.error('createOrUpdateProfile: Supabase client is not available.');
      setError('Supabase client not available.');
      return null;
    }

    try {
      console.log('createOrUpdateProfile: Calling fetchProfile...'); // Log before fetch
      const existingProfile = await fetchProfile(currentUser.id);
      console.log('createOrUpdateProfile: Fetched existingProfile data:', JSON.stringify(existingProfile)); // Log detailed data
      console.log('createOrUpdateProfile: fetchProfile returned:', existingProfile ? 'Profile found' : 'No profile found'); // Log after fetch

      const userMetadata = currentUser.app_metadata;
      const isSocialLogin = !!(userMetadata?.provider && userMetadata.provider !== 'email');
      const effectiveProvider = userMetadata?.provider || 'email';

      if (!existingProfile) {
        console.log('createOrUpdateProfile: No existing profile, creating new one...'); // Log before create
        const profileData: Partial<Profile> = {
          id: currentUser.id,
          email: currentUser.email || null, // Default to null if not provided
          username: null, // Username to be set during onboarding ideally
          avatar_url: userMetadata?.avatar_url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          has_completed_onboarding: isSocialLogin,
          google_id: effectiveProvider === 'google' ? userMetadata.provider_id : null,
          discord_id: effectiveProvider === 'discord' ? userMetadata.provider_id : null,
        };

        console.log('createOrUpdateProfile: Attempting insert with data:', profileData);
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(profileData as Profile) // Cast needed if insert expects full Profile type
          .select()
          .single();

        console.log('createOrUpdateProfile: Insert result:', { newProfile, insertError }); // Log after create

        if (insertError) {
          console.error('Error creating profile:', insertError);
          setError(`Failed to create profile: ${insertError.message}`);
          return null;
        }

        console.log('createOrUpdateProfile: New profile created:', newProfile?.id);
        return newProfile;
      } else {
        console.log('createOrUpdateProfile: Existing profile found. Checking for updates...'); // Log before update check
        let needsUpdate = false;
        const updates: Partial<Profile> = { updated_at: new Date().toISOString() };

        // Update provider ID if missing or different
        if (effectiveProvider === 'google' && !existingProfile.google_id && userMetadata.provider_id) {
          updates.google_id = userMetadata.provider_id;
          needsUpdate = true;
          console.log('createOrUpdateProfile: Updating google_id.');
        }
        if (effectiveProvider === 'discord' && !existingProfile.discord_id && userMetadata.provider_id) {
          updates.discord_id = userMetadata.provider_id;
          needsUpdate = true;
           console.log('createOrUpdateProfile: Updating discord_id.');
        }
        // Potentially update email if it was missing before (handle with care)
        if (!existingProfile.email && currentUser.email) {
           updates.email = currentUser.email;
           needsUpdate = true;
           console.log('createOrUpdateProfile: Updating missing email.');
        }

        if (needsUpdate) {
          console.log('createOrUpdateProfile: Applying updates:', updates); // Log before update
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', currentUser.id)
            .select()
            .single();

          console.log('createOrUpdateProfile: Update result:', { updatedProfile, updateError }); // Log after update

          if (updateError) {
            console.error('Error updating profile:', updateError);
            setError(`Failed to update profile: ${updateError.message}`);
            return existingProfile; // Return old profile on error
          }

          console.log('createOrUpdateProfile: Profile updated:', updatedProfile?.id);
          return updatedProfile;
        } else {
          console.log('createOrUpdateProfile: No updates needed.');
          return existingProfile;
        }
      }
    } catch (err: any) {
      console.error('Error in createOrUpdateProfile catch block:', err);
      setError(`Failed to process profile: ${err.message}`);
      return null;
    } finally {
        console.log('createOrUpdateProfile: Finished for user:', currentUser.id); // Log finish
    }
  }, [supabase, fetchProfile]); // Keep dependencies stable

  // Effect to initialize auth state and handle session changes
  useEffect(() => {
    let isMounted = true;
    console.log("Auth Effect: Running initial session check...");
    // Start loading only when this effect runs
    // We avoid setting it true initially to prevent flicker if session is immediately available
    const timer = setTimeout(() => {
      if (isMounted && !session) { // Only set loading if session hasn't arrived quickly
        setIsLoading(true);
      }
    }, 150); // Small delay to avoid flicker

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      clearTimeout(timer); // Clear the timer if session arrives quickly
      if (!isMounted) return;
      console.log("Auth Effect: getSession() resolved. Session found:", !!initialSession);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      // REMOVED profile fetching from here
    }).catch((err) => {
        clearTimeout(timer);
        console.error("Auth Effect: Error in getSession():", err);
        // Optionally set an error state here if needed
    }).finally(() => {
        // CRITICAL: Set loading false *after* session check completes, regardless of outcome
        if (isMounted) {
            clearTimeout(timer);
            console.log("Auth Effect: Initial session check finished. Setting isLoading=false");
            setIsLoading(false);
        }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!isMounted) return;
        console.log(`Auth Effect: onAuthStateChange event: ${_event}`);

        // Update session and user state immediately
        const currentUser = currentSession?.user ?? null;
        const previousUser = user; // Capture previous user for comparison

        setSession(currentSession);
        setUser(currentUser);

        // Clear profile if signed out or user becomes null
        if (!currentUser || _event === 'SIGNED_OUT') {
            if (isMounted) setProfile(null);
        }

        // Explicitly set loading false on sign-in/out events if it somehow got stuck
        if (isLoading && (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION' || _event === 'SIGNED_OUT')) {
            if (isMounted) {
                console.log(`Auth Effect: onAuthStateChange (${_event}) setting isLoading=false as fallback.`);
                setIsLoading(false);
            }
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timer);
      console.log("Auth Effect: Unsubscribing auth listener");
      authListener?.subscription.unsubscribe();
    };
  // Only depend on supabase client itself for this effect
  }, [supabase]);

  // Effect to handle profile fetching/creation when user changes or on specific events
  useEffect(() => {
    let isMounted = true;
    console.log("Profile Effect: Running. User ID:", user?.id);

    if (user) {
      // Consider if profile needs fetching/creating
      // Fetch profile if user exists but profile doesn't, or if profile might be stale
      // We might not need to call createOrUpdateProfile on *every* user change if profile exists
      // But for simplicity and robustness on initial load/refresh, we call it.
      console.log("Profile Effect: User found, processing profile...");
      createOrUpdateProfile(user).then(profileResult => {
        if (isMounted) {
            console.log("Profile Effect: Profile processed, result:", profileResult ? 'Exists' : 'null');
            setProfile(profileResult);
        }
      }).catch(err => {
         console.error("Profile Effect: Error processing profile:", err);
         // Handle error appropriately, maybe set an error state in context
         if (isMounted) setProfile(null); // Ensure profile is null on error
      }).finally(() => {
          console.log("Profile Effect: Finished processing for user:", user?.id);
          // If using a separate profile loading state, set it false here
      });
    } else {
      // If user becomes null, ensure profile is also null
      if (isMounted) setProfile(null);
      console.log("Profile Effect: User is null, ensuring profile is null.");
    }

    return () => {
        isMounted = false;
        console.log("Profile Effect: Cleanup.");
    };
    // Depend on user object identity and the creation function
  }, [user, createOrUpdateProfile]);

  // Auth methods 
  const loginWithDiscord = async (redirectPath = '/profile') => {
    try {
      setError(null);
      await signInWithDiscord(redirectPath);
    } catch (err: any) { 
      console.error('Discord login error:', err);
      const errorMessage = typeof err.message === 'string' ? err.message :
                        typeof err === 'string' ? err : 'An unknown error occurred during Discord login.';
      setError(errorMessage);
    }
  };

  const loginWithGoogle = async (redirectPath = '/profile') => {
    try {
      setError(null);
      await signInWithGoogle(redirectPath);
    } catch (err: any) {
      console.error('Google login error:', err);
      const errorMessage = typeof err.message === 'string' ? err.message :
                        typeof err === 'string' ? err : 'An unknown error occurred during Google login.';
      setError(errorMessage);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut();
      // Listener handles state clearing
      if (typeof window !== 'undefined') {
        router.push('/login'); 
      }
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(`Failed to logout: ${err?.message || 'Unknown error'}`);
    }
  };

  const updateMinecraftUsername = async (minecraftUsername: string): Promise<Profile | null> => {
    try {
      setError(null);
      if (!user) throw new Error('You must be logged in to update your Minecraft username');
      if (!minecraftUsername) {
         throw new Error('Minecraft username cannot be empty');
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
      console.error('Update Minecraft username error:', err);
      setError(err.message || 'Failed to update Minecraft username');
      return null;
    }
  };

  const validateMinecraftUsername = async (minecraftUsername: string) => {
      // ... implementation ... 
      return { valid: false, message: 'Validation not implemented' }; 
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<Profile | null> => {
    try {
      setError(null);

      if (!user) throw new Error('You must be logged in to update your profile');

      // ... validation ...

      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select('*')
        .single();

      if (error) throw error;

      console.log('AuthContext updateProfile: Fetched updated data:', data); // Log fetched data
      setProfile(data); 
      console.log('AuthContext updateProfile: Called setProfile with new data.'); // Log after setProfile call
      return data;
    } catch (err: any) {
      console.error('Update profile error:', err);
      setError(err.message || 'Failed to update profile');
      return null;
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      setError(null);

      if (!user) throw new Error('You must be logged in to update your password');
      if (!currentPassword || !newPassword) throw new Error('Passwords cannot be empty');

      // Consider adding password strength validation

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Password updated successfully
      console.log('Password updated successfully');

    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'Failed to update password');
      throw err; 
    }
  };

  const value: AuthContextType = {
    supabase, // *** Add supabase client to the value object ***
    user,
    profile,
    session,
    error,
    isAuthenticated,
    isAdmin,
    loginWithDiscord,
    loginWithGoogle,
    logout,
    fetchProfile,
    updateMinecraftUsername,
    validateMinecraftUsername,
    updateProfile,
    updatePassword,
    clearError,
    isLoading, // Use the correct loading state
  };

  // Conditional Rendering based on isLoading
  if (isLoading) {
    // TODO: Replace with a proper loading component/spinner
    return <div>Loading authentication...</div>; 
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};