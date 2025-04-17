"use client";

import React, { useState, useEffect } from 'react';
import { FaDiscord, FaGoogle, FaEnvelope } from 'react-icons/fa';
import { useAuth } from './AuthContext';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import styles from './LoginModal.module.css';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { NineSliceContainer } from '../UI';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, redirectPath = '/profile' }) => {
  const { loginWithDiscord, loginWithGoogle, error, loading, clearError, profile } = useAuth();
  const [authInProgress, setAuthInProgress] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isEmailMode, setIsEmailMode] = useState(false);
  const router = useRouter();
  
  // Store the redirectPath when the modal opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && redirectPath && redirectPath !== '/profile') {
      console.log('LoginModal: Storing redirect path:', redirectPath);
      localStorage.setItem('auth_redirect_after_login', redirectPath);
    }
  }, [isOpen, redirectPath]);

  // Clear errors when modal closes
  useEffect(() => {
    if (!isOpen && error) {
      clearError();
    }
  }, [isOpen, error, clearError]);

  // Handle redirection when profile is loaded
  useEffect(() => {
    if (profile) {
      // Only proceed if the modal is open and we're not already on the target page
      if (isOpen && typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const storedRedirect = localStorage.getItem('auth_redirect_after_login');
        const targetPath = !profile.has_completed_onboarding ? '/onboarding' : (storedRedirect || redirectPath);
        
        console.log('LoginModal: Redirect decision:', {
          currentPath,
          storedRedirect,
          providedRedirectPath: redirectPath,
          hasCompletedOnboarding: profile.has_completed_onboarding,
          finalTargetPath: targetPath
        });
        
        if (currentPath !== targetPath) {
          console.log(`LoginModal: Redirecting from ${currentPath} to ${targetPath}`);
          // Clear the stored redirect after using it
          if (storedRedirect) {
            localStorage.removeItem('auth_redirect_after_login');
          }
          
          // For mobile devices, force a page reload to ensure we have a clean state
          const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (isMobileDevice) {
            // Close the modal first to prevent it from showing on reload
            handleClose();
            
            // Set active session flag before navigating
            localStorage.setItem('auth_session_active', 'true');
            localStorage.setItem('auth_user_id', profile.id);
            
            // Use location.href instead of router for a full page reload
            window.location.href = targetPath;
          } else {
            // On desktop, we can use the router
            router.replace(targetPath);
          }
        }
      }
    }
  }, [profile, redirectPath, router, isOpen]);

  if (!isOpen) return null;
  
  const handleClose = () => {
    clearError();
    setFormError(null);
    setEmail('');
    setPassword('');
    setIsEmailMode(false);
    setUsername('');
    onClose();
  };
  
  const handleDiscordLogin = async () => {
    setAuthInProgress('discord');
    try {
      // Ensure redirectPath is stored for auth callback
      if (typeof window !== 'undefined') {
        // Check if on mobile
        const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Always store the current redirectPath (from props) before login
        console.log('LoginModal: Setting redirect for Discord login:', redirectPath);
        localStorage.setItem('auth_redirect_after_login', redirectPath);
        
        // Add a timestamp to detect potential loops
        localStorage.setItem('auth_login_timestamp', Date.now().toString());
        
        // If on mobile, set a flag for special handling
        if (isMobileDevice) {
          localStorage.setItem('auth_on_mobile', 'true');
        }
      }
      
      await loginWithDiscord(redirectPath);
    } catch (err) {
      console.error('Discord login error in component:', err);
    } finally {
      setAuthInProgress(null);
    }
  };
  
  const handleGoogleLogin = async () => {
    setAuthInProgress('google');
    try {
      // Ensure redirectPath is stored for auth callback
      if (typeof window !== 'undefined') {
        // Check if on mobile
        const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Always store the current redirectPath (from props) before login
        console.log('LoginModal: Setting redirect for Google login:', redirectPath);
        localStorage.setItem('auth_redirect_after_login', redirectPath);
        
        // Add a timestamp to detect potential loops
        localStorage.setItem('auth_login_timestamp', Date.now().toString());
        
        // If on mobile, set a flag for special handling
        if (isMobileDevice) {
          localStorage.setItem('auth_on_mobile', 'true');
        }
      }
      
      await loginWithGoogle(redirectPath);
    } catch (err) {
      console.error('Google login error in component:', err);
    } finally {
      setAuthInProgress(null);
    }
  };

  const handleNavigateToOnboarding = () => {
    // Simply navigate to the onboarding page
    router.push('/onboarding');
    // Close the modal
    handleClose();
  };

  const handleEmailSignup = async () => {
    setAuthInProgress('email');
    setFormError(null);
    
    // Validate username
    if (!username || username.trim().length < 3) {
      setFormError('Username must be at least 3 characters long');
      setAuthInProgress(null);
      return;
    }
    
    try {
      // Ensure redirectPath is stored for auth callback
      if (typeof window !== 'undefined') {
        // Always store the current redirectPath before signup
        console.log('LoginModal: Setting redirect for email signup:', redirectPath);
        localStorage.setItem('auth_redirect_after_login', redirectPath);
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: username
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectPath)}`
        }
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data?.user) {
        // Also create/update profile with username
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: username,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (profileError) {
          console.error('Error creating profile during signup:', profileError);
          // Continue anyway as the auth part worked
        }
      
        if (data.session) {
          // User is auto-confirmed and signed in (development mode or certain Supabase settings)
          window.location.href = `/auth/callback?redirectTo=${encodeURIComponent(redirectPath)}`;
        } else {
          // Show confirmation message - email verification needed
          handleClose();
          router.push('/login?verificationSent=true');
        }
      }
    } catch (error) {
      console.error('Error during email signup:', error);
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setAuthInProgress(null);
    }
  };

  const handleEmailLogin = async () => {
    setAuthInProgress('email');
    setFormError(null);
    
    try {
      // Ensure redirectPath is stored for auth callback
      if (typeof window !== 'undefined') {
        // Check if on mobile
        const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Always store the current redirectPath before login
        console.log('LoginModal: Setting redirect for email login:', redirectPath);
        localStorage.setItem('auth_redirect_after_login', redirectPath);
        
        // Add a timestamp to detect potential loops
        localStorage.setItem('auth_login_timestamp', Date.now().toString());
        
        // If on mobile, set a flag for special handling
        if (isMobileDevice) {
          localStorage.setItem('auth_on_mobile', 'true');
        }
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data?.user) {
        // On mobile devices, use a different approach to prevent redirect loops
        const isMobileDevice = typeof window !== 'undefined' && 
          /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobileDevice) {
          // For mobile devices, we'll handle everything here without redirecting to the callback
          console.log('Mobile email login successful, handling directly');
          
          // Store authentication state in localStorage
          localStorage.setItem('auth_session_active', 'true');
          localStorage.setItem('auth_user_id', data.user.id);
          
          // Check if the user has completed onboarding
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
            
            // Close the modal first
            handleClose();
            
            if (profileData) {
              if (!profileData.has_completed_onboarding) {
                // Redirect to onboarding if not completed
                window.location.href = '/onboarding';
              } else {
                // Otherwise redirect to the requested path
                window.location.href = redirectPath;
              }
            } else {
              // If no profile exists, redirect to onboarding
              window.location.href = '/onboarding';
            }
          } catch (profileError) {
            console.error('Error fetching profile after mobile login:', profileError);
            // Default redirect
            window.location.href = redirectPath;
          }
        } else {
          // For desktop: use the original callback approach
          window.location.href = `/auth/callback?redirectTo=${encodeURIComponent(redirectPath)}`;
        }
      }
    } catch (error) {
      console.error('Error during login:', error);
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setAuthInProgress(null);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEmailMode ? 'Sign In' : 'Login to Enderfall'}>
      <NineSliceContainer className={styles.modalContent}>
        {(error || formError) && (
          <div className={styles.errorMessage}>
            {error || formError}
          </div>
        )}
        
        {!isEmailMode ? (
          <>
            <p className={styles.modalText}>
              Sign in with your Discord or Google account, or create a new account with email.
            </p>
            
            <Button 
              onClick={handleDiscordLogin}
              variant="primary"
              className={styles.discordButton}
              disabled={loading || authInProgress !== null}
              size="medium"
            >
              <FaDiscord className={styles.buttonIcon} />
              <span>
                {authInProgress === 'discord' ? 'Connecting...' : 'Continue with Discord'}
              </span>
            </Button>
            
            <Button 
              onClick={handleGoogleLogin}
              variant="primary"
              className={styles.googleButton}
              disabled={loading || authInProgress !== null}
              size="medium"
            >
              <FaGoogle className={styles.buttonIcon} />
              <span>
                {authInProgress === 'google' ? 'Connecting...' : 'Continue with Google'}
              </span>
            </Button>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <Button 
              onClick={() => setIsEmailMode(true)}
              variant="primary"
              className={styles.emailButton}
              size="medium"
            >
              <FaEnvelope className={styles.buttonIcon} />
              <span>Sign In with Email</span>
            </Button>
          </>
        ) : (
          <>
            <div className={styles.emailForm}>
              <Input
                type="email"
                label="Email"
                value={email}
                layout="horizontal"
                onChange={(e) => setEmail(e.target.value)}
                className={styles.emailInput}
              />
              <Input
                type="password"
                label="Password"
                value={password}
                layout="horizontal"
                onChange={(e) => setPassword(e.target.value)}
                className={styles.emailInput}
              />
              <Button
                onClick={handleEmailLogin}
                variant="primary"
                className={styles.emailButton}
                disabled={!email || !password}
                size="medium"
              >
                <span>{authInProgress === 'email' ? 'Signing In...' : 'Sign In'}</span>
              </Button>
              <div className={styles.divider}>
                <span>or</span>
              </div>
              <Button
                onClick={handleNavigateToOnboarding}
                variant="secondary"
                size="medium"
                className={styles.createAccountButton}
              >
                <span>Create Account</span>
              </Button>
              <Button
                onClick={() => setIsEmailMode(false)}
                variant="ghost"
                size="medium"
                className={styles.backButton}
              >
                Back to Login Options
              </Button>
            </div>
          </>
        )}
        
        <div className={styles.termsText}>
          By continuing, you agree to Enderfall's <a href="/legal/terms">Terms of Service</a> and <a href="/legal/privacy">Privacy Policy</a>.
        </div>
      </NineSliceContainer>
    </Modal>
  );
};

export default LoginModal; 