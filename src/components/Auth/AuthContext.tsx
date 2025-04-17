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
    if (authChecked) return; // Skip if auth is already initialized
    
    const authListener = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        
        // Update session whenever it changes
        if (newSession !== session) {
          setSession(newSession);
        }
        
        if (event === 'SIGNED_IN' && newSession?.user) {
          console.log('User signed in:', newSession.user.id);
          setUser(newSession.user);
          
          // Create or update profile when user logs in
          const userProfile = await createOrUpdateProfile(newSession.user);
          setProfile(userProfile);
          
          if (!userProfile) {
            setError('Your account was created, but we had trouble setting up your profile. Try refreshing the page.');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          setProfile(null);
          setSession(null);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          console.log('Token refreshed for user:', newSession.user.id);
          setUser(newSession.user);
        } else if (event === 'USER_UPDATED' && newSession?.user) {
          console.log('User updated:', newSession.user.id);
          setUser(newSession.user);
          // Refresh profile after user update
          const userProfile = await fetchProfile(newSession.user.id);
          setProfile(userProfile);
        }
      }
    );
    
    // Also perform a manual check to ensure the current session is recognized
    const checkCurrentAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession && currentSession.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Make sure we have the user's profile
          const userProfile = await fetchProfile(currentSession.user.id);
          if (userProfile) {
            setProfile(userProfile);
          } else {
            // Try to create a profile if one doesn't exist
            const createdProfile = await createOrUpdateProfile(currentSession.user);
            setProfile(createdProfile);
          }
        }
      } catch (err) {
        console.error('Error checking current auth state:', err);
      } finally {
        setLoading(false);
        setAuthChecked(true);
      }
    };
    
    checkCurrentAuth();
    
    return () => {
      authListener.data.subscription.unsubscribe();
    };
  }, [authChecked]);
  
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