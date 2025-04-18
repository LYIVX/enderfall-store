"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/UI/Button';
import { FaUser, FaBox, FaCreditCard, FaCube, FaDiscord, FaGoogle, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaComments, FaCog } from 'react-icons/fa';
import { useAuth } from '@/components/Auth/AuthContext';
import dynamic from 'next/dynamic';
import { LinkMinecraftModal } from '@/components/Profile/LinkMinecraftModal';
import styles from './page.module.css';
import AccountSettings from '@/components/Profile/AccountSettings';
import { isPageRefresh } from '@/lib/navigation';
import Tabs from '@/components/UI/Tabs';
import PurchaseHistory from '@/components/Profile/PurchaseHistory';
import UserForums from '@/components/Profile/UserForums';
import ProfileInfo from '@/components/Profile/ProfileInfo';
import { NineSliceContainer } from '@/components/UI';

// Dynamically import the LoadingSpinner component
const LoadingSpinner = dynamic(() => import('@/components/UI/LoadingSpinner'), {
  ssr: false,
  loading: () => <div className={styles.fallbackSpinner}>Loading...</div>
});

export default function ProfilePage() {
  const { user, profile, logout, isLoading, error, supabase } = useAuth(); // Get supabase from context
  console.log('Auth Context State on component mount:', { user, profile, isLoading, error });
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(searchParams?.get('tab') || 'profile');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isMinecraftModalOpen, setIsMinecraftModalOpen] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // State variables
  
  // Check for link success/error parameters
  useEffect(() => {
    if (!searchParams) return;
    
    const linkSuccess = searchParams.get('link_success');
    const linkError = searchParams.get('error');
    
    if (linkSuccess === 'true') {
      setNotification({
        type: 'success',
        message: 'Account linked successfully!'
      });
      
      // Clear the URL parameters after processing
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (linkError) {
      let errorMessage = 'Failed to link account';
      
      switch (linkError) {
        case 'provider_mismatch':
          errorMessage = 'Provider mismatch. Please try again with the correct account type.';
          break;
        case 'link_failed':
          errorMessage = 'Failed to link account. Please try again later.';
          break;
        case 'no_profile':
          errorMessage = 'No profile found to link to. Please log in first.';
          break;
        default:
          errorMessage = `Error: ${linkError}`;
      }
      
      setNotification({
        type: 'error',
        message: errorMessage
      });
      
      // Clear the URL parameters after processing
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);
  
  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // Prevent getting stuck in loading state
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000); // 5 second timeout
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  // Helper function to check if the page is being refreshed
  const isPageRefresh = () => {
    if (typeof window === 'undefined') return false;
    return (
      window.performance &&
      window.performance.navigation &&
      window.performance.navigation.type === 1
    );
  };

  // Redirect to login page if not authenticated
  useEffect(() => {
    // Only redirect if we've completed the auth check and user is not authenticated
    if ((!isLoading || loadingTimeout) && !user) {
      console.log('User not authenticated, redirecting to login page');
      
      // Use replace instead of push to avoid redirect loops in browser history
      router.replace('/login');
    }
  }, [isLoading, loadingTimeout, user, router]);
  
  if (isLoading && !loadingTimeout) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
        <p>Loading your profile...</p>
      </div>
    );
  }
  
  if (!user || !profile) {
    return null; // Let the useEffect handle redirection
  }
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  const handleLogout = async () => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
    await logout(currentPath);
  };
  
  const handleUnlinkAccount = async (provider: 'discord' | 'google') => {
    try {
      setUnlinking(provider);
      
      // Prepare the request body with the provider and userId for fallback in development
      const requestBody: any = { provider };
      
      // Include userId as a fallback for development environments
      if (user?.id) {
        requestBody.userId = user.id;
      }
      
      console.log(`Attempting to unlink ${provider} account`);
      
      const response = await fetch('/api/auth/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        // Ensure cookies are sent with the request
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error(`Error response from unlink API:`, data);
        throw new Error(data.error || `Failed to unlink ${provider} account`);
      }
      
      // On success, update the profile data directly in state
      if (profile && provider === 'discord') {
        profile.discord_id = null;
      } else if (profile && provider === 'google') {
        profile.google_id = null;
      }
      
      setNotification({
        type: 'success',
        message: data.message || `${provider.charAt(0).toUpperCase() + provider.slice(1)} account unlinked successfully!`,
      });
      
      // Force a refresh to update the UI
      router.refresh();
    } catch (err: any) {
      console.error(`Error unlinking ${provider}:`, err);
      setNotification({
        type: 'error',
        message: err.message || `Failed to unlink ${provider} account`,
      });
    } finally {
      setUnlinking(null);
    }
  };
  
  const handleLinkAccount = async (provider: 'discord' | 'google') => {
    try {
      setNotification(null); // Clear previous notifications
      console.log(`Initiating link with ${provider}...`);
      
      // Ensure supabase client from context is available
      if (!supabase) {
        throw new Error('Supabase client not available from AuthContext');
      }
      
      // 1. Refresh the session to ensure we have a valid access token
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Error refreshing session:', refreshError);
        setNotification({
          type: 'error',
          message: `Session refresh failed: ${refreshError.message}`,
        });
        return; // Stop if session refresh fails
      }
      console.log('Session refreshed successfully.');
      
      // 2. Get the full current URL to redirect back to after linking
      const redirectUrl = window.location.href;
      
      // 3. Attempt to link the identity
      const { error: linkError } = await supabase.auth.linkIdentity({
        provider: provider,
        options: {
          redirectTo: redirectUrl, // Ensures user returns to the profile page
        },
      });
      
      if (linkError) {
        console.error(`Error initiating ${provider} link:`, linkError);
        setNotification({
          type: 'error',
          message: `Failed to start linking process for ${provider}: ${linkError.message}`,
        });
      }
      // No need for further action here; Supabase handles the redirect.
      // The useEffect hook checking searchParams will handle success/error display upon return.
      
    } catch (error: any) {
      console.error(`Unexpected error during ${provider} link process:`, error);
      setNotification({
        type: 'error',
        message: `An unexpected error occurred: ${error.message}`,
      });
    }
  };
  
  // Use a safe version of profile for rendering
  const safeProfile = {
    username: profile?.username || 'User',
    avatar_url: profile?.avatar_url || '/default-avatar.png',
    minecraft_username: profile?.minecraft_username,
    minecraft_uuid: profile?.minecraft_uuid, // Add this line
    discord_id: profile?.discord_id,
    google_id: profile?.google_id,
    created_at: profile?.created_at || new Date().toISOString(),
  };
  
  // Create tabs for TabSection
  const tabs = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <FaUser />,
      content: (
        <div className={styles.profileContent}>
          <ProfileInfo
            profile={safeProfile}
            onOpenMinecraftModal={() => setIsMinecraftModalOpen(true)}
            onLinkDiscord={() => handleLinkAccount('discord')}
            onLinkGoogle={() => handleLinkAccount('google')}
            onUnlinkAccount={handleUnlinkAccount}
            unlinking={unlinking}
          />
        </div>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <FaCog />,
      content: (
        <div className={styles.settingsContent}>
          <AccountSettings 
            email={user?.email || ''} 
            username={safeProfile.username}
          />
        </div>
      ),
    },
    {
      id: 'forums',
      label: 'Forums',
      icon: <FaComments />,
      content: (
        <div className={styles.forumsContent}>
          <h2>My Forums</h2>
          {user && <UserForums userId={user.id} />}
        </div>
      ),
    },
    {
      id: 'purchases',
      label: 'Purchases',
      icon: <FaBox />,
      content: (
        <div className={styles.purchasesContent}>
          <h2>Purchase History</h2>
          <PurchaseHistory />
        </div>
      ),
    },
  ];
  
  console.log('ProfilePage: Rendering ProfileInfo with profile:', JSON.stringify(profile));
  
  return (
    <NineSliceContainer variant='blue' className={styles.profilePageContainer}>
      {notification && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
          <span>{notification.message}</span>
        </div>
      )}
      
      <div className={styles.profileContent}>
        <NineSliceContainer className={styles.profileHeader}>
          <h1>My Profile</h1>
          <Button variant="danger" onClick={handleLogout}>
            Logout
          </Button>
        </NineSliceContainer>
        
        <Tabs 
          tabs={tabs} 
          activeTab={activeTab} 
          onChange={handleTabChange} 
          showContentBackground={true}
          showContainerBackground={false}
        />
        
        {/* Account linking modals */}
        <LinkMinecraftModal 
          isOpen={isMinecraftModalOpen}
          onClose={() => setIsMinecraftModalOpen(false)}
          onSuccess={() => {
            setNotification({
              type: 'success',
              message: 'Minecraft account linked successfully!'
            });
          }}
        />
      </div>
    </NineSliceContainer>
  );
} 