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
  const [isLoading, setIsLoading] = useState(true); 
  const router = useRouter();

  // Compute isAuthenticated based on user state
  const isAuthenticated = !!user && !!session;

  // Compute isAdmin based on profile state
  const isAdmin = profile ? (profile as any).is_admin === true : false;

  // Helper to clear error state
  const clearError = () => setError(null);

  // Fetch user profile from Supabase
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log(`Fetching profile for user: ${userId}`);
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && status !== 406) { // 406: Not acceptable (means no rows found)
        console.error('Error fetching profile:', error.message);
        return null;
      }
      console.log('Profile fetched in fetchProfile:', data?.id);
      return data;
    } catch (e: any) {
      console.error('Exception fetching profile:', e.message);
      return null;
    }
  }, [supabase]);

  // Create or update user profile
  const createOrUpdateProfile = useCallback(async (currentUser: User): Promise<Profile | null> => {
     console.log(`createOrUpdateProfile called for user: ${currentUser.id}`);
     try {
       let userProfile = await fetchProfile(currentUser.id);
       const userMetadata = currentUser.user_metadata || {};
       const appMetadata = currentUser.app_metadata || {};
       const provider = appMetadata.provider || currentUser.identities?.slice(-1)[0]?.provider || 'unknown';
       const providerId = userMetadata.provider_id || currentUser.identities?.slice(-1)[0]?.identity_data?.sub;

       if (!userProfile) {
         console.log('Creating new profile for user:', currentUser.id);
         const isSocialLogin = provider === 'google' || provider === 'discord';
         const profileData: Partial<Profile> = {
           id: currentUser.id,
           email: currentUser.email || 'No Email Provided',
           username: userMetadata.full_name || userMetadata.name || userMetadata.user_name || userMetadata.preferred_username || `User_${currentUser.id.substring(0, 8)}`,
           avatar_url: userMetadata.avatar_url || null,
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString(),
           has_completed_onboarding: isSocialLogin,
           google_id: provider === 'google' ? providerId : null,
           discord_id: provider === 'discord' ? providerId : null
         };
         const { data: newProfile, error: createError } = await supabase
           .from('profiles')
           .upsert(profileData)
           .select('*')
           .single();
         if (createError) throw createError;
         console.log('Profile created:', newProfile?.id);
         return newProfile;
       } else {
         // Profile exists, check for updates
         console.log('Existing profile found for user:', currentUser.id);
         const updates: Partial<Profile> = {};
         let needsUpdate = false;

         // Update email if changed
         if (currentUser.email && userProfile.email !== currentUser.email) {
           updates.email = currentUser.email; needsUpdate = true; 
         }
         // Update username if changed from metadata
         const newUsername = userMetadata.full_name || userMetadata.name || userMetadata.user_name || userMetadata.preferred_username;
         if (newUsername && userProfile.username !== newUsername) {
           updates.username = newUsername; needsUpdate = true;
         }
         // Update avatar if changed from metadata
         if (userMetadata.avatar_url && userProfile.avatar_url !== userMetadata.avatar_url) {
           updates.avatar_url = userMetadata.avatar_url; needsUpdate = true;
         }
         // Update provider ID if missing or different
         if (provider === 'google' && providerId && userProfile.google_id !== providerId) {
           updates.google_id = providerId; needsUpdate = true;
         }
         if (provider === 'discord' && providerId && userProfile.discord_id !== providerId) {
           updates.discord_id = providerId; needsUpdate = true;
         }

         if (needsUpdate) {
           updates.updated_at = new Date().toISOString();
           console.log('Applying updates to profile:', JSON.stringify(updates));
           const { data: updatedProfile, error: updateError } = await supabase
             .from('profiles')
             .update(updates)
             .eq('id', currentUser.id)
             .select('*')
             .single();
           if (updateError) {
              console.error('Error updating profile:', updateError);
              return userProfile; // Return old profile on error
           }
           console.log('Profile updated:', updatedProfile?.id);
           return updatedProfile;
         } else {
            console.log('No profile updates needed.');
            return userProfile;
         }
       }
     } catch (err: any) {
       console.error('Error in createOrUpdateProfile:', err);
       setError(`Failed to process profile: ${err.message}`);
       return null;
     }
  }, [supabase, fetchProfile]);

  // Effect to initialize auth state and listen for changes
  useEffect(() => {
    let isMounted = true;
    console.log("Auth Effect: Running initial check...");

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      console.log("Auth Effect: getSession() resolved. Session found:", !!initialSession);
      setSession(initialSession);
      const initialUser = initialSession?.user ?? null;
      setUser(initialUser);

      if (initialUser) {
        try {
          // Fetch or create profile as part of initial check
          const profileResult = await createOrUpdateProfile(initialUser);
          if (isMounted) setProfile(profileResult);
        } catch (err) {
          console.error("Auth Effect: Error processing profile during initial check:", err);
          // Handle error appropriately, maybe set an error state
        }
      }
    }).catch((err) => {
        console.error("Auth Effect: Error in getSession():", err);
    }).finally(() => {
        // Set loading false after initial check completes
        if (isMounted) {
            console.log("Auth Effect: Initial check finished. Setting isLoading=false");
            setIsLoading(false);
        }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!isMounted) return;
        console.log(`Auth Effect: onAuthStateChange event: ${_event}`);
        const currentUser = currentSession?.user ?? null;

        // Update session and user state
        setSession(currentSession);
        setUser(currentUser);

        // Handle profile based on user state and event
        if (currentUser && (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED')) {
          try {
             console.log(`Auth Effect: ${_event}, processing profile...`);
             const profileResult = await createOrUpdateProfile(currentUser);
             if (isMounted) setProfile(profileResult);
          } catch (err) {
             console.error(`Auth Effect: Error processing profile during ${_event}:`, err);
          }
        } else if (_event === 'SIGNED_OUT') {
          if (isMounted) setProfile(null); // Clear profile on sign out
        } else if (!currentUser) {
           // Ensure profile is null if user becomes null for other reasons
           if (isMounted) setProfile(null);
        }

        // *** FALLBACK MECHANISM ***
        // If isLoading is still true when a significant auth event occurs,
        // set it to false here to prevent getting stuck.
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
      console.log("Auth Effect: Unsubscribing auth listener");
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, createOrUpdateProfile]);

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

      setProfile(data); 
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