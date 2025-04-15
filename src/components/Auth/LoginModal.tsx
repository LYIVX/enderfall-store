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
          router.replace(targetPath);
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
        // Always store the current redirectPath (from props) before login
        console.log('LoginModal: Setting redirect for Discord login:', redirectPath);
        localStorage.setItem('auth_redirect_after_login', redirectPath);
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
        // Always store the current redirectPath (from props) before login
        console.log('LoginModal: Setting redirect for Google login:', redirectPath);
        localStorage.setItem('auth_redirect_after_login', redirectPath);
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
        // Always store the current redirectPath before login
        console.log('LoginModal: Setting redirect for email login:', redirectPath);
        localStorage.setItem('auth_redirect_after_login', redirectPath);
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
        // Pass the redirectPath to the auth callback to ensure proper redirection
        window.location.href = `/auth/callback?redirectTo=${encodeURIComponent(redirectPath)}`;
        
        // Manually update context if needed (triggering a refresh)
        try {
          // Force a page refresh after a short delay to ensure auth is recognized
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } catch (refreshError) {
          console.error('Error refreshing auth state:', refreshError);
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
    <Modal isOpen={isOpen} onClose={handleClose} title={isEmailMode ? 'Create Account' : 'Login to Enderfall'}>
      <div className={styles.modalContent}>
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
              fullWidth
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
              fullWidth
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
              fullWidth
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
              />
              <Input
                type="text"
                label="Username"
                value={username}
                layout="horizontal"
                onChange={(e) => setUsername(e.target.value)}
              />
              <Input
                type="password"
                label="Password"
                value={password}
                layout="horizontal"
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                onClick={handleEmailSignup}
                variant="primary"
                className={styles.emailButton}
                fullWidth
              >
                <FaEnvelope className={styles.buttonIcon} />
                <span>Create Account</span>
              </Button>
              <Button
                onClick={handleEmailLogin}
                variant="secondary"
                disabled={!email || !password}
                fullWidth
              >
                <span>Sign In</span>
              </Button>
              <Button
                onClick={() => setIsEmailMode(false)}
                variant="ghost"
                fullWidth
              >
                Back to Login Options
              </Button>
            </div>
          </>
        )}
        
        <div className={styles.termsText}>
          By continuing, you agree to Enderfall's <a href="/legal/terms">Terms of Service</a> and <a href="/legal/privacy">Privacy Policy</a>.
        </div>
      </div>
    </Modal>
  );
};

export default LoginModal; 