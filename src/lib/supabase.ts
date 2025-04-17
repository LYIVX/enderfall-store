import { createClient } from '@supabase/supabase-js';
import { type Session, type User } from '@supabase/supabase-js';

// Define the database schema types
export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  minecraft_username: string | null;
  discord_id: string | null;
  google_id: string | null;
  email: string | null;
  has_completed_onboarding: boolean;
  has_password: boolean;
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
}

// Shop Item related types
export type ShopItemCategory = 
  | 'Serverwide Ranks'
  | 'Towny Ranks'
  | 'Beta Access'
  | 'Cosmetics'
  | 'Perks'
  | 'Bundles';

export interface ShopItemPerk {
  name: string;
  icon: string;
  tooltip: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  price_id: string;
  category_id: string;
  category?: string;
  icon: string;
  color: string;
  color2?: string;
  perks: ShopItemPerk[];
  is_exclusive: boolean;
  is_new: boolean;
  is_popular: boolean;
  is_upgrade?: boolean;
  from_rank_id?: string;
  to_rank_id?: string;
  display_order?: number;
  categories?: Category;
  created_at: string;
  updated_at: string;
}

export interface ForumPost {
  id: string;
  title: string;
  summary?: string;
  content: string;
  category: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  pinned: boolean;
  likes: number;
  thumbnail_url?: string | null;
  author?: Profile | null;
  is_blog?: boolean;
  is_markdown?: boolean;
}

export interface ForumComment {
  id: string;
  post_id: string;
  content: string;
  user_id: string;
  created_at: string;
  author: Profile;
}

export interface ForumLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export type UserPurchase = {
  id: string;
  user_id: string;
  item_id: string;
  purchase_date: string;
  transaction_id: string | null;
  shop_items?: ShopItem;
};

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  friend?: Profile;
}

export interface Conversation {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  participants?: Profile[];
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender?: Profile;
  username?: string;
  avatar_url?: string | null;
}

export interface SocialPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  is_markdown: boolean;
  likes: number;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface SocialPostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env.local file.');
}

// Check if we're in a browser and on a mobile device
const isBrowser = typeof window !== 'undefined';
const isMobileDevice = isBrowser && /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Create and export the Supabase client with optimized settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: isBrowser
      ? {
          getItem: (key) => {
            try {
              // Try localStorage first (most reliable)
              const localValue = localStorage.getItem(key);
              if (localValue) return localValue;
              
              // Fall back to sessionStorage if localStorage fails
              const sessionValue = sessionStorage.getItem(key);
              if (sessionValue) return sessionValue;
              
              // Fall back to cookies as last resort
              return getCookie(key);
            } catch (e) {
              console.error('Error accessing storage:', e);
              return null;
            }
          },
          setItem: (key, value) => {
            try {
              // Store in multiple places for redundancy
              // This helps with cross-browser and mobile issues
              localStorage.setItem(key, value);
              try { sessionStorage.setItem(key, value); } catch (e) {}
              
              // Also set a cookie as backup (especially for iOS)
              setCookie(key, value);
              
              // For mobile devices, add extra indicator
              if (isMobileDevice) {
                localStorage.setItem('auth_session_active', 'true');
                localStorage.setItem('auth_last_updated', new Date().toISOString());
              }
            } catch (e) {
              console.error('Error setting item in storage:', e);
            }
          },
          removeItem: (key) => {
            try {
              localStorage.removeItem(key);
              try { sessionStorage.removeItem(key); } catch (e) {}
              removeCookie(key);
              
              if (isMobileDevice) {
                localStorage.removeItem('auth_session_active');
              }
            } catch (e) {
              console.error('Error removing item from storage:', e);
            }
          }
        }
      : undefined
  },
  // Force longer sessions for better persistence
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to get a cookie by name
function getCookie(name: string): string | null {
  if (!isBrowser) return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// Helper function to set a cookie with good defaults for auth
function setCookie(name: string, value: string): void {
  if (!isBrowser) return;
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};samesite=lax;${
    window.location.protocol === 'https:' ? 'secure;' : ''
  }`;
}

// Helper function to remove a cookie
function removeCookie(name: string): void {
  if (!isBrowser) return;
  document.cookie = `${name}=;path=/;max-age=0;samesite=lax;${
    window.location.protocol === 'https:' ? 'secure;' : ''
  }`;
}

// Helper functions for authentication
export const signInWithDiscord = async (redirectPath = '/profile') => {
  try {
    console.log('Initiating Discord sign in...', { redirectPath });
    
    // Always store the redirect path before login to ensure we return to the right page
    if (typeof window !== 'undefined') {
      console.log('Storing Discord redirect path in localStorage:', redirectPath);
      localStorage.setItem('auth_redirect_after_login', redirectPath);
      
      // Debug: Log all auth-related localStorage items
      console.log('Current localStorage auth items:');
      Object.keys(localStorage).forEach(key => {
        if (key.includes('auth') || key.includes('redirect')) {
          console.log(`- ${key}: ${localStorage.getItem(key)}`);
        }
      });
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?redirectTo=${encodeURIComponent(redirectPath)}`
      }
    });
    
    if (error) {
      console.error('Discord sign in error:', error);
      throw error;
    }
    
    console.log('Discord sign in initiated successfully, redirect URL:', data.url);
    return data;
  } catch (err) {
    console.error('Error in signInWithDiscord:', err);
    throw err;
  }
};

export const signInWithGoogle = async (redirectPath = '/profile') => {
  try {
    console.log('Initiating Google sign in...', { redirectPath });
    
    // Always store the redirect path before login to ensure we return to the right page
    if (typeof window !== 'undefined') {
      console.log('Storing Google redirect path in localStorage:', redirectPath);
      localStorage.setItem('auth_redirect_after_login', redirectPath);
      
      // Debug: Log all auth-related localStorage items
      console.log('Current localStorage auth items:');
      Object.keys(localStorage).forEach(key => {
        if (key.includes('auth') || key.includes('redirect')) {
          console.log(`- ${key}: ${localStorage.getItem(key)}`);
        }
      });
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?redirectTo=${encodeURIComponent(redirectPath)}`
      }
    });
    
    if (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
    
    console.log('Google sign in initiated successfully, redirect URL:', data.url);
    return data;
  } catch (err) {
    console.error('Error in signInWithGoogle:', err);
    throw err;
  }
};

export const signOut = async () => {
  try {
    console.log('Signing out user...');
    
    // Clear any auth-related local storage items
    if (typeof window !== 'undefined') {
      // Clear any custom auth data we might have stored
      localStorage.removeItem('supabase.auth.token');
      
      // Clear any Supabase-related items with a more comprehensive approach
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear session cookies
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
    }
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut({
      scope: 'global' // Sign out from all tabs/devices
    });
    
    // Additional confirmation of session removal for safety
    await supabase.auth.setSession({ access_token: '', refresh_token: '' });
    
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
    
    console.log('Sign out successful');
  } catch (err) {
    console.error('Error in signOut:', err);
    throw err;
  }
};

export const getCurrentSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error.message);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('Unexpected error in getCurrentSession:', err);
    return null;
  }
};

export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error.message);
      return null;
    }
    
    console.log('Current user data:', data.user?.id || 'No user');
    return data.user;
  } catch (err) {
    console.error('Unexpected error in getCurrentUser:', err);
    return null;
  }
};

// Update a user's Minecraft username
export const updateMinecraftUsername = async (userId: string, minecraftUsername: string) => {
  try {
    console.log(`Updating Minecraft username for user ${userId} to ${minecraftUsername}`);
    
    // First validate the Minecraft username
    const isValid = /^[a-zA-Z0-9_]{3,16}$/.test(minecraftUsername);
    if (!isValid) {
      throw new Error('Invalid Minecraft username. Username must be 3-16 characters and only contain letters, numbers, and underscores.');
    }
    
    // Update the profile in the database
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        minecraft_username: minecraftUsername,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();
      
    if (error) {
      console.error('Error updating Minecraft username:', error);
      throw error;
    }
    
    console.log('Minecraft username updated successfully:', data);
    return data;
  } catch (err) {
    console.error('Error in updateMinecraftUsername:', err);
    throw err;
  }
};

// Link a Discord account manually (this would be used if the automatic linking during auth failed)
export const linkDiscordAccount = async (userId: string, discordId: string): Promise<Profile | null> => {
  try {
    console.log(`Linking Discord account ${discordId} to user ${userId}`);
    
    // First check if this Discord ID is already linked to another user
    const { data: existingProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('discord_id', discordId);
    
    if (checkError) {
      console.error('Error checking for existing Discord link:', checkError);
      throw new Error('Failed to check for existing Discord links');
    }
    
    // If this Discord ID is already linked to another user, prevent the linking
    if (existingProfiles && existingProfiles.length > 0 && existingProfiles[0].id !== userId) {
      console.error(`Discord ID ${discordId} is already linked to user ${existingProfiles[0].id}`);
      throw new Error('This Discord account is already linked to another user');
    }
    
    // All clear, update the profile with the Discord ID
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        discord_id: discordId, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error linking Discord account:', error);
      throw error;
    }
    
    console.log('Discord account linked successfully:', data);
    return data;
  } catch (err) {
    console.error('Error in linkDiscordAccount:', err);
    throw err;
  }
};

// Link a Google account manually (this would be used if the automatic linking during auth failed)
export const linkGoogleAccount = async (userId: string, googleId: string): Promise<Profile | null> => {
  try {
    console.log(`Linking Google account ${googleId} to user ${userId}`);
    
    // First check if this Google ID is already linked to another user
    const { data: existingProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('google_id', googleId);
    
    if (checkError) {
      console.error('Error checking for existing Google link:', checkError);
      throw new Error('Failed to check for existing Google links');
    }
    
    // If this Google ID is already linked to another user, prevent the linking
    if (existingProfiles && existingProfiles.length > 0 && existingProfiles[0].id !== userId) {
      console.error(`Google ID ${googleId} is already linked to user ${existingProfiles[0].id}`);
      throw new Error('This Google account is already linked to another user');
    }
    
    // All clear, update the profile with the Google ID
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        google_id: googleId, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error linking Google account:', error);
      throw error;
    }
    
    console.log('Google account linked successfully:', data);
    return data;
  } catch (err) {
    console.error('Error in linkGoogleAccount:', err);
    throw err;
  }
};

// Get Minecraft account validation status (could be expanded to check against Mojang API)
export const validateMinecraftUsername = async (minecraftUsername: string) => {
  try {
    console.log(`Validating Minecraft username: ${minecraftUsername}`);
    
    // Basic validation
    const isValid = /^[a-zA-Z0-9_]{3,16}$/.test(minecraftUsername);
    if (!isValid) {
      return {
        valid: false,
        message: 'Invalid username format. Minecraft usernames must be 3-16 characters and only contain letters, numbers, and underscores.'
      };
    }
    
    // For a real implementation, you would check against Mojang API here
    // This is a placeholder for now
    return {
      valid: true,
      message: 'Username format is valid'
    };
  } catch (err) {
    console.error('Error validating Minecraft username:', err);
    return {
      valid: false,
      message: 'Error validating username'
    };
  }
};

// Set password for a user
export async function setUserPassword(password: string): Promise<{ success: boolean; error?: string }> {
  console.log('setUserPassword - Starting password update process');
  
  try {
    // Check for active session
    console.log('Checking for active session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return { success: false, error: 'Session error' };
    }
    
    if (!session) {
      console.error('No active session found');
      return { success: false, error: 'No active session' };
    }
    
    console.log('Active session found');
    
    // Get current user
    console.log('Getting current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      return { success: false, error: 'User error' };
    }
    
    if (!user) {
      console.error('No user found');
      return { success: false, error: 'No user found' };
    }
    
    console.log('Current user found:', user.id);
    
    // For OAuth users, we need to set up their password
    if (user.app_metadata.provider !== 'email') {
      console.log('User is OAuth user, setting up password...');
      
      // Update user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });
      
      if (updateError) {
        console.error('Error updating password:', updateError);
        return { success: false, error: updateError.message };
      }
      
      console.log('Password updated successfully');
      return { success: true };
    }
    
    // For email users, we need to check if the password is the same
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password
    });
    
    if (signInError) {
      console.error('Error checking password:', signInError);
      return { success: false, error: signInError.message };
    }
    
    console.log('Password verified successfully');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in setUserPassword:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

// Update user profile data
export const updateUserProfile = async (userId: string, profileData: Partial<Profile>): Promise<Profile | null> => {
  try {
    console.log(`Updating profile for user ${userId}`, profileData);
    
    // Update the profile with provided data
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();
      
    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
    
    console.log('Profile updated successfully:', data);
    return data;
  } catch (err) {
    console.error('Error in updateUserProfile:', err);
    throw err;
  }
};

// Complete onboarding process
export const completeUserOnboarding = async (userId: string): Promise<Profile | null> => {
  try {
    console.log(`Marking onboarding as complete for user ${userId}`);
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        has_completed_onboarding: true,
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId)
      .select('*')
      .single();
      
    if (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
    
    console.log('Onboarding marked as complete:', data);
    return data;
  } catch (err) {
    console.error('Error in completeUserOnboarding:', err);
    throw err;
  }
};

// Function to check if a user has liked a post
export const hasUserLikedPost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    console.log(`Checking like status for post: ${postId} and user: ${userId}`);
    
    // Use count instead of select().single() to avoid 406 errors
    const { count, error } = await supabase
      .from('forum_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error checking if user liked post:', error);
      return false;
    }
    
    console.log(`Like status result: found ${count} likes`);
    return count ? count > 0 : false;
  } catch (err) {
    console.error('Unexpected error in hasUserLikedPost:', err);
    return false;
  }
};

// Function to toggle like for a post
export const togglePostLike = async (postId: string, userId: string): Promise<{ success: boolean; liked: boolean }> => {
  try {
    // Check if the user has already liked the post
    const hasLiked = await hasUserLikedPost(postId, userId);
    
    if (hasLiked) {
      // Unlike: Delete the like record
      const { error: deleteError } = await supabase
        .from('forum_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
        
      if (deleteError) throw deleteError;
      
      // Decrement the likes count in the post
      const { error: updateError } = await supabase.rpc('decrement_post_likes', { post_id: postId });
      
      if (updateError) throw updateError;
      
      return { success: true, liked: false };
    } else {
      // Like: Insert a new like record
      const { error: insertError } = await supabase
        .from('forum_likes')
        .insert({ post_id: postId, user_id: userId });
        
      if (insertError) throw insertError;
      
      // Increment the likes count in the post
      const { error: updateError } = await supabase.rpc('increment_post_likes', { post_id: postId });
      
      if (updateError) throw updateError;
      
      return { success: true, liked: true };
    }
  } catch (err) {
    console.error('Error in togglePostLike:', err);
    return { success: false, liked: false };
  }
};

// Social functions
export const getFriendships = async (userId: string): Promise<Friendship[]> => {
  try {
    // First, get friendships where the user is the requester
    const { data: outgoingFriendships, error: outgoingError } = await supabase
      .from('friendships')
      .select(`
        *,
        friend:friend_id(id, username, avatar_url, minecraft_username, is_admin)
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (outgoingError) throw outgoingError;
    
    // Then get friendships where the user is the recipient
    const { data: incomingFriendships, error: incomingError } = await supabase
      .from('friendships')
      .select(`
        *,
        friend:user_id(id, username, avatar_url, minecraft_username, is_admin)
      `)
      .eq('friend_id', userId)
      .eq('status', 'accepted');
      
    if (incomingError) throw incomingError;
    
    // Combine both sets of friendships
    return [...(outgoingFriendships || []), ...(incomingFriendships || [])];
  } catch (error) {
    console.error('Error fetching friendships:', error);
    return [];
  }
};

export const getFriendRequests = async (userId: string): Promise<Friendship[]> => {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        friend:user_id(id, username, avatar_url, minecraft_username, is_admin)
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }
};

export const getOutgoingFriendRequests = async (userId: string): Promise<Friendship[]> => {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        friend:friend_id(id, username, avatar_url, minecraft_username, is_admin)
      `)
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching outgoing friend requests:', error);
    return [];
  }
};

export const sendFriendRequest = async (userId: string, friendId: string): Promise<{ success: boolean, error?: string }> => {
  try {
    // Check if there's already a friendship
    const { data: existingFriendship, error: checkError } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .or(`user_id.eq.${friendId},friend_id.eq.${friendId}`);

    if (checkError) throw checkError;

    if (existingFriendship && existingFriendship.length > 0) {
      return { success: false, error: 'A friendship or request already exists' };
    }

    // Create new friendship request
    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: 'pending'
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const respondToFriendRequest = async (
  friendshipId: string,
  response: 'accepted' | 'rejected'
): Promise<{ success: boolean, error?: string }> => {
  try {
    const { error } = await supabase
      .from('friendships')
      .update({ status: response })
      .eq('id', friendshipId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error responding to friend request:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const removeFriend = async (friendshipId: string): Promise<{ success: boolean, error?: string }> => {
  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const getConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    // Get all conversations where the user is a participant
    const { data: participations, error: participationsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (participationsError) throw participationsError;

    if (!participations || participations.length === 0) {
      return [];
    }

    const conversationIds = participations.map(p => p.conversation_id);

    // Get the conversations with their latest message
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user_id,
          profiles:profiles!user_id(id, username, avatar_url, minecraft_username, is_admin)
        )
      `)
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (conversationsError) throw conversationsError;

    // For each conversation, fetch the latest message
    const conversationsWithLastMessage = await Promise.all(
      (conversations || []).map(async (conversation) => {
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id(id, username, avatar_url)
          `)
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (messagesError) throw messagesError;
        
        // Properly format the participants array to extract profile info
        const formattedParticipants = conversation.participants
          ? conversation.participants.map((p: any) => {
              // Extract the profile from the nested structure
              const profile = p.profiles;
              if (profile) {
                return {
                  id: profile.id,
                  username: profile.username || 'Unknown User',
                  avatar_url: profile.avatar_url,
                  minecraft_username: profile.minecraft_username,
                  is_admin: profile.is_admin
                };
              }
              return null;
            }).filter(Boolean)
          : [];
        
        // Format the last_message to include sender details at the top level
        let lastMessage = null;
        if (messages && messages.length > 0) {
          const sender = messages[0].sender || {};
          lastMessage = {
            ...messages[0],
            username: sender.username || 'Unknown User',
            avatar_url: sender.avatar_url
          };
        }

        return {
          ...conversation,
          participants: formattedParticipants,
          last_message: lastMessage,
        };
      })
    );

    return conversationsWithLastMessage;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(id, username, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Format messages to include sender info at the top level
    const formattedMessages = data ? data.map(message => {
      const sender = message.sender || {};
      return {
        ...message,
        username: sender.username || 'Unknown User',
        avatar_url: sender.avatar_url
      };
    }) : [];
    
    return formattedMessages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string
): Promise<{ success: boolean, message?: Message, error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content
      })
      .select();

    if (error) throw error;

    // Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return { success: true, message: data?.[0] };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const createConversation = async (
  participantIds: string[]
): Promise<{ success: boolean, conversationId?: string, error?: string }> => {
  try {
    if (!participantIds || participantIds.length < 1) {
      throw new Error("At least one participant is required");
    }
    
    // Check if a conversation between these participants already exists (for direct messages)
    if (participantIds.length === 2) {
      // For 2 participants, we can check if they already have a conversation
      const { data: existingConversations, error: checkError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .in('user_id', participantIds);

      if (checkError) throw checkError;

      if (existingConversations && existingConversations.length > 0) {
        // Group conversations by conversation_id and count participants
        const conversationCounts: Record<string, number> = {};
        
        for (const participant of existingConversations) {
          if (!conversationCounts[participant.conversation_id]) {
            conversationCounts[participant.conversation_id] = 1;
          } else {
            conversationCounts[participant.conversation_id]++;
          }
        }
        
        // Find any conversation that has exactly the number of participants we're looking for
        const matchingConversationId = Object.keys(conversationCounts).find(
          convId => conversationCounts[convId] === participantIds.length
        );
        
        if (matchingConversationId) {
          // Check if the matching conversation has exactly our participants
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', matchingConversationId);
            
          const allMatchingParticipants = participants?.every(p => 
            participantIds.includes(p.user_id)
          );
          
          if (allMatchingParticipants && participants?.length === participantIds.length) {
            // This conversation already exists with the exact same participants
            return { success: true, conversationId: matchingConversationId };
          }
        }
      }
    }

    // Create a new conversation if no existing one found
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        updated_at: new Date().toISOString()
      })
      .select();

    if (conversationError) throw conversationError;

    const conversationId = conversationData?.[0]?.id;
    if (!conversationId) {
      throw new Error("Failed to create conversation: No ID returned");
    }

    // Add participants
    const participants = participantIds.map(userId => ({
      conversation_id: conversationId,
      user_id: userId
    }));

    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert(participants);

    if (participantsError) throw participantsError;

    return { success: true, conversationId };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const getSocialPosts = async (followingOnly: boolean = false, userId?: string): Promise<SocialPost[]> => {
  try {
    if (followingOnly && !userId) {
      return [];
    }

    let query = supabase
      .from('social_posts')
      .select(`
        *,
        author:user_id(id, username, avatar_url, minecraft_username, is_admin)
      `)
      .order('created_at', { ascending: false });

    if (followingOnly && userId) {
      // Get friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      const { data: friendRequests } = await supabase
        .from('friendships')
        .select('user_id')
        .eq('friend_id', userId)
        .eq('status', 'accepted');

      const friendIds = [
        ...(friendships?.map(f => f.friend_id) || []),
        ...(friendRequests?.map(f => f.user_id) || [])
        // Removed userId to exclude user's own posts when showing friends only
      ];

      if (friendIds.length === 0) {
        // No friends, return empty result 
        return [];
      }

      query = query.in('user_id', friendIds);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching social posts:', error);
    return [];
  }
};

export const getUserSocialPosts = async (userId: string): Promise<SocialPost[]> => {
  try {
    const { data, error } = await supabase
      .from('social_posts')
      .select(`
        *,
        author:user_id(id, username, avatar_url, minecraft_username, is_admin)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user social posts:', error);
    return [];
  }
};

export const createSocialPost = async (
  userId: string,
  content: string,
  imageUrl?: string | null,
  isMarkdown: boolean = false
): Promise<{ success: boolean, post?: SocialPost, error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        user_id: userId,
        content,
        image_url: imageUrl,
        is_markdown: isMarkdown
      })
      .select();

    if (error) throw error;
    return { success: true, post: data?.[0] };
  } catch (error) {
    console.error('Error creating social post:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const likeSocialPost = async (postId: string, userId: string): Promise<{ success: boolean, error?: string }> => {
  try {
    // Check if already liked
    const { data: existingLike, error: checkError } = await supabase
      .from('social_post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (checkError) throw checkError;

    if (existingLike && existingLike.length > 0) {
      // Already liked, so unlike
      const { error: deleteError } = await supabase
        .from('social_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;
      return { success: true };
    }

    // Not liked, so like
    const { error: insertError } = await supabase
      .from('social_post_likes')
      .insert({
        post_id: postId,
        user_id: userId
      });

    if (insertError) throw insertError;
    return { success: true };
  } catch (error) {
    console.error('Error toggling social post like:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const hasUserLikedSocialPost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('social_post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking if user liked social post:', error);
    return false;
  }
};

export const getSocialPostComments = async (postId: string): Promise<SocialPostComment[]> => {
  try {
    const { data, error } = await supabase
      .from('social_post_comments')
      .select(`
        *,
        author:user_id(id, username, avatar_url, minecraft_username, is_admin)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching social post comments:', error);
    return [];
  }
};

export const createSocialPostComment = async (
  postId: string,
  userId: string,
  content: string
): Promise<{ success: boolean, comment?: SocialPostComment, error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('social_post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content
      })
      .select();

    if (error) throw error;
    return { success: true, comment: data?.[0] };
  } catch (error) {
    console.error('Error creating social post comment:', error);
    return { success: false, error: (error as Error).message };
  }
}; 