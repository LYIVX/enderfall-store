"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/components/Auth/AuthContext';
import LoginModal from '@/components/Auth/LoginModal';
import Button from '@/components/UI/Button';
import Box from '@/components/UI/Box';
import styles from './page.module.css';
import { NineSliceContainer } from '@/components/UI';

export default function LoginPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, loading, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const error = searchParams ? searchParams.get('error') : null;
  const redirectPathParam = searchParams ? searchParams.get('redirect') : null;
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Log the auth state
  useEffect(() => {
    console.log('Login page auth state:', { isAuthenticated, loading, redirectPath });
    
    // Add a timeout to prevent getting stuck in loading state
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 3000); // 3 second timeout
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loading, redirectPath]);

  // Get redirect from localStorage, referrer, or default to profile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRedirect = localStorage.getItem('auth_redirect_after_login');
      
      // Use the URL param first, then stored redirect, then fall back to /profile
      setRedirectPath(redirectPathParam || storedRedirect || '/profile');
    }
  }, [redirectPathParam]);

  // Handle referrer for already authenticated users
  useEffect(() => {
    if ((isAuthenticated || user) && typeof window !== 'undefined' && !redirectPath) {
      // If there's a referrer (the page they came from), use that instead of /profile
      const referrer = document.referrer;
      const referrerUrl = referrer ? new URL(referrer) : null;
      const referrerPath = referrerUrl && referrerUrl.origin === window.location.origin 
        ? referrerUrl.pathname + referrerUrl.search
        : null;
      
      // Set the redirect path to referrer or default to homepage
      setRedirectPath(referrerPath || '/');
    }
  }, [isAuthenticated, user, redirectPath]);

  // Show loading state while checking auth, but not for too long
  if (loading && !loadingTimeout) {
    return (
      <div className={styles.loadingContainer}>
        <NineSliceContainer variant="blue" className={styles.loginContent}>
          <div className={styles.loadingSpinner}></div>
          <NineSliceContainer className={styles.logoContainer}>
          <NineSliceContainer className={styles.loadingContainer_h2}>
            Checking Authentication
          </NineSliceContainer>
          <NineSliceContainer className={styles.loadingContainer_p}>Please wait while we verify your login status...</NineSliceContainer>
          </NineSliceContainer>
        </NineSliceContainer>
      </div>
    );
  }

  // If user is already authenticated, show message with link
  if (isAuthenticated || user) {
    return (
      <div className={styles.loadingContainer}>
        <NineSliceContainer variant="blue" className={styles.loginContent}>
          <NineSliceContainer className={styles.logoContainer}>
          <div className={styles.logoPlaceholder}>⏣</div>
          <h2 className={styles.loginTitle}>You're already logged in! </h2>
          <p className={styles.loginDescription}>You can continue to your profile or the requested page.</p>
          </NineSliceContainer>
          <div className={styles.actionButtons}>
            <Link href={redirectPath || '/profile'}>
              <Button 
                variant="primary" 
                size="large"
              >
                Continue
              </Button>
            </Link>
          </div>
        </NineSliceContainer>  
      </div>
    );
  }

  const getErrorMessage = () => {
    if (!error) return null;

    switch (error) {
      case 'access_denied':
        return 'Access was denied during the login process. Please try again.';
      case 'session_expired':
        return 'Your session has expired. Please log in again.';
      case 'auth_error':
        return 'There was an error during authentication. Please try again.';
      case 'profile':
        return 'We had trouble creating your profile. Please try again or contact support.';
      default:
        return 'An error occurred during login. Please try again.';
    }
  };

  const errorMessage = getErrorMessage();

  return (
    <div className={styles.loginPage}>
      <NineSliceContainer variant="blue" className={styles.loginContent}>
        <NineSliceContainer className={styles.logoContainer}>
          <div className={styles.logoPlaceholder}>⏣</div>
        <h1 className={styles.loginTitle}>Welcome to Enderfall</h1>
        <p className={styles.loginDescription}>
          Connect with your Discord or Google account to access your profile, purchase history, and manage your Enderfall experience.
        </p>
        </NineSliceContainer>
        
        {errorMessage && (
          <div className={styles.errorMessage}>
            {errorMessage}
          </div>
        )}
        
        <Button 
          variant="primary"
          size="large"
          onClick={() => setIsModalOpen(true)}
        >
          Log In / Sign Up
        </Button>
      </NineSliceContainer>
      
      <LoginModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        redirectPath={redirectPath || '/profile'}
      />
    </div>
  );
} 