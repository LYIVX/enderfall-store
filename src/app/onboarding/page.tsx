"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FaUser, FaUpload, FaEye, FaEyeSlash, FaLock, FaCheck, FaExclamationTriangle, FaEnvelope } from 'react-icons/fa';
import { useAuth } from '@/components/Auth/AuthContext';
import { supabase, setUserPassword, updateUserProfile, completeUserOnboarding } from '@/lib/supabase';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import Box from '@/components/UI/Box';
import styles from './OnboardingModal.module.css';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';

// Password strength criteria
const hasLower = (password: string) => /[a-z]/.test(password);
const hasUpper = (password: string) => /[A-Z]/.test(password);
const hasNumber = (password: string) => /[0-9]/.test(password);
const hasSpecial = (password: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
const isLongEnough = (password: string) => password.length >= 8;

// Calculate password strength
const calculatePasswordStrength = (password: string): { score: number; label: string } => {
  if (!password) return { score: 0, label: 'None' };
  
  let score = 0;
  if (hasLower(password)) score++;
  if (hasUpper(password)) score++;
  if (hasNumber(password)) score++;
  if (hasSpecial(password)) score++;
  if (isLongEnough(password)) score++;
  
  if (score === 0) return { score: 0, label: 'None' };
  if (score <= 2) return { score: 1, label: 'Weak' };
  if (score <= 3) return { score: 2, label: 'Fair' };
  if (score === 4) return { score: 3, label: 'Good' };
  return { score: 4, label: 'Strong' };
};

// Define the steps for onboarding
const STEPS = [
  { id: 'email', label: 'Email' },
  { id: 'password', label: 'Password' },
  { id: 'username', label: 'Username' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'complete', label: 'Complete' }
];

export default function OnboardingPage() {
  const { user, profile, loading, error } = useAuth();
  const router = useRouter();
  
  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCurrentStepValid, setIsCurrentStepValid] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check authentication and onboarding status
  useEffect(() => {
    console.log('Onboarding page useEffect triggered:', { loading, user, profile });
    
    if (!loading) {
      if (user) {
        // If user is authenticated and has completed onboarding, redirect to profile
        if (profile?.has_completed_onboarding) {
          console.log('User has completed onboarding, redirecting to profile');
          
          // Only redirect if we're not already on the profile page
          if (typeof window !== 'undefined' && window.location.pathname !== '/profile') {
            router.replace('/profile');
          }
        } else {
          // If user is authenticated but hasn't completed onboarding, allow them to stay
          console.log('User is authenticated and needs onboarding');
        }
      } else {
        // If user is not authenticated, allow them to stay on the page
        console.log('User is not authenticated, allowing access to onboarding');
      }
    }
  }, [loading, user, profile, router]);

  // Initialize form with user data when loaded
  useEffect(() => {
    if (profile) {
      console.log('Initializing form with profile data:', profile);
      setEmail(profile.email || '');
      setUsername(profile.username || '');
      if (profile.avatar_url) {
        setAvatarPreview(profile.avatar_url);
      }
    }
  }, [profile]);
  
  // Check verification status
  useEffect(() => {
    const checkVerification = async () => {
      if (!user || !verificationSent) return;
      
      setIsVerifying(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking verification:', error);
          return;
        }
        
        if (session?.user?.email_confirmed_at) {
          // Email is verified, proceed with profile update
          await completeProfileSetup();
        }
      } catch (error) {
        console.error('Error in checkVerification:', error);
      } finally {
        setIsVerifying(false);
      }
    };
    
    const interval = setInterval(checkVerification, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [user, verificationSent]);

  // Complete profile setup after verification
  const completeProfileSetup = async () => {
    if (!user) return;

    try {
      const userId = user.id;

      // Upload avatar if provided
      let avatarUrl = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
        if (!avatarUrl) {
          setFormErrors({
            ...formErrors,
            avatar: 'Failed to upload avatar. Please try again or skip this step.'
          });
          return;
        }
      }

      // Create or update the user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username,
          avatar_url: avatarUrl,
          minecraft_username: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
        setFormErrors({
          ...formErrors,
          general: 'Failed to save profile information. Please try again.'
        });
        return;
      }

      // Update display_name in auth.users to match the username
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { display_name: username }
      });

      if (authUpdateError) {
        console.error('Error updating display_name in auth.users:', authUpdateError);
        // Continue even if this fails
      }

      // Navigate to profile page
      router.push('/profile');
    } catch (error) {
      console.error('Error completing profile setup:', error);
      setFormErrors({
        ...formErrors,
        general: 'An unexpected error occurred. Please try again.'
      });
    }
  };
  
  // Handle file selection for avatar upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setFormErrors({ ...formErrors, avatar: 'Please select an image file.' });
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFormErrors({ ...formErrors, avatar: 'Image must be less than 2MB.' });
      return;
    }
    
    setAvatarFile(file);
    setFormErrors({ ...formErrors, avatar: '' });
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Upload avatar to storage
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Try to upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          upsert: true
        });
      
      if (error) {
        console.error('Error uploading avatar:', error);
        // If bucket not found, return the existing avatar URL
        if (error.message === 'Bucket not found') {
          console.log('Bucket not found, using existing avatar URL');
          return profile?.avatar_url || null;
        }
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadAvatar:', error);
      // Return existing avatar URL on any error
      return profile?.avatar_url || null;
    }
  };
  
  // Validate current step
  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (STEPS[currentStep].id) {
      case 'email':
        if (!email) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        break;
        
      case 'password':
        if (!password) {
          newErrors.password = 'Password is required';
        } else if (password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else if (calculatePasswordStrength(password).score < 2) {
          newErrors.password = 'Password is too weak';
        }
        
        if (password !== confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
        
      case 'username':
        if (!username) {
          newErrors.username = 'Username is required';
        } else if (username.length < 3) {
          newErrors.username = 'Username must be at least 3 characters';
        }
        break;
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, email, password, confirmPassword, username]);
  
  // Check validation when form fields change
  useEffect(() => {
    const isValid = validateStep();
    setIsCurrentStepValid(isValid);
  }, [validateStep, email, password, confirmPassword, username]);
  
  // Handle next button click
  const handleNext = async () => {
    console.log('handleNext called, current step:', STEPS[currentStep].id);
    
    // Validate current step
    if (!isCurrentStepValid) {
      console.log('Step validation failed');
      return;
    }
    
    // If this is the last step, complete onboarding
    if (currentStep === STEPS.length - 1) {
      await handleComplete();
      return;
    }
    
    // For password step, just validate the password
    if (STEPS[currentStep].id === 'password') {
      console.log('Validating password...');
      // Just validate the password format
      if (password.length < 8) {
        setFormErrors({
          ...formErrors,
          password: 'Password must be at least 8 characters long'
        });
        return;
      }
    }
    
    // Move to next step
    console.log('Moving to next step:', currentStep + 1);
    setCurrentStep(prev => prev + 1);
  };
  
  // Handle back button click
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Handle form completion
  const handleComplete = async () => {
    setIsProcessing(true);
    
    try {
      // Create user if not exists
      if (!user) {
        console.log('Creating new user for email signup...');
        const { data: { user: newUser }, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (error) {
          console.error('Error creating user:', error);
          setFormErrors({
            ...formErrors,
            general: 'Failed to create account. Please try again.'
          });
          return;
        }

        console.log('User created successfully:', newUser);
        setVerificationSent(true);
        return;
      }
      
      // If user exists, proceed with profile setup
      await completeProfileSetup();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setFormErrors({
        ...formErrors,
        general: 'Failed to complete setup. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Get password strength
  const passwordStrength = calculatePasswordStrength(password);
  const passwordStrengthClass = passwordStrength.score === 0 ? '' : 
                               passwordStrength.score === 1 ? styles.weak :
                               passwordStrength.score === 2 ? styles.fair :
                               passwordStrength.score === 3 ? styles.good : styles.strong;
  
  // If loading, show loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.onboardingModal}>
          <div className={styles.modalHeader}>
            <h1>Setting Up Your Account</h1>
            <p>Loading your information...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Render current step content
  const renderStepContent = () => {
    // Handle verification step
    if (verificationSent) {
      return (
        <>
          <div className={styles.formGroup} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', color: 'var(--primary)', marginBottom: '16px' }}>
              <FaEnvelope />
            </div>
            <h2>Check Your Email</h2>
            <p>We've sent a verification link to:</p>
            <p style={{ fontWeight: 'bold', margin: '8px 0' }}>{email}</p>
            <p>Please click the link in the email to verify your account.</p>
            {isVerifying && (
              <p style={{ color: 'var(--primary)', marginTop: '16px' }}>
                Checking verification status...
              </p>
            )}
          </div>
        </>
      );
    }

    // Handle regular steps
    const currentStepData = STEPS[currentStep];
    if (!currentStepData) return null;

    switch (currentStepData.id) {
      case 'email':
        return (
          <>
            <Input
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              error={formErrors.email}
            />
            <p className={styles.formHelp}>
              We'll send a verification link to this email address.
            </p>
          </>
        );
      case 'password':
        return (
          <>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Password</label>
              <div className={styles.passwordContainer}>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  required
                  label=""
                  error={formErrors.password}
                  className={styles.formPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {password && (
                <>
                  <div className={styles.passwordStrength}>
                    Password strength: {calculatePasswordStrength(password).label}
                  </div>
                  <div className={styles.passwordStrengthMeter}>
                    <div className={
                      `${styles.passwordStrengthIndicator} ${
                        password ? (
                          calculatePasswordStrength(password).score === 1 ? styles.weak :
                          calculatePasswordStrength(password).score === 2 ? styles.fair :
                          calculatePasswordStrength(password).score === 3 ? styles.good :
                          calculatePasswordStrength(password).score === 4 ? styles.strong : ''
                        ) : ''
                      }`
                    }></div>
                  </div>
                </>
              )}
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Confirm Password</label>
              <div className={styles.passwordContainer}>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  label=""
                  error={formErrors.confirmPassword}
                  className={styles.formPassword}
                />
              </div>
            </div>
          </>
        );
      case 'username':
        return (
          <>
            <Input
              type="text"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              error={formErrors.username}
            />
            <p className={styles.formHelp}>
              This will be your display name on the website.
            </p>
          </>
        );
      case 'avatar':
        return (
          <>
            <div className={styles.avatarSection}>
              <div className={styles.avatarPreview}>
                {avatarPreview ? (
                  <AvatarWithStatus
                    userId="temp"
                    avatarUrl={avatarPreview}
                    username={username || 'User'}
                    size="large"
                  />
                ) : (
                  <FaUser />
                )}
              </div>
              <div className={styles.avatarUpload}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className={styles.uploadInput}
                  id="avatar-upload"
                />
                <Button
                  variant="secondary"
                  size="medium"
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.uploadButton}
                >
                  <FaUpload /> Select Image
                </Button>
              </div>
              {formErrors.avatar && (
                <p className={styles.formError}>{formErrors.avatar}</p>
              )}
              <p className={styles.formHelp}>
                Optional: Upload a profile picture. Max size: 2MB.
              </p>
            </div>
          </>
        );
      case 'complete':
        return (
          <>
            <div className={styles.formGroup} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', color: 'var(--success)', marginBottom: '16px' }}>
                <FaCheck />
              </div>
              <h2>You're All Set!</h2>
              <p>Your account has been created successfully.</p>
              <p style={{ marginTop: '16px' }}>
                Click 'Complete' to continue to your profile page.
              </p>
            </div>
          </>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className={styles.container}>
      <Box className={styles.onboardingModal}>
        <div className={styles.modalHeader}>
          <h1>Welcome to Enderfall</h1>
          <p>Complete your account setup to get started</p>
        </div>
        
        <div className={styles.modalContent}>
          {/* Progress indicator */}
          <div className={styles.progressContainer}>
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className={styles.progressStep}>
                  <div className={`${styles.stepDot} ${index < currentStep ? styles.complete : index === currentStep ? styles.active : ''}`}></div>
                  <div className={`${styles.stepLabel} ${index === currentStep ? styles.active : ''}`}>{step.label}</div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`${styles.stepLine} ${index < currentStep ? styles.active : ''}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
          
          {/* Form content */}
          <div>
            {formErrors.general && (
              <div className={styles.formError}>{formErrors.general}</div>
            )}
            {renderStepContent()}
          </div>
          
          {/* Navigation buttons */}
          <div className={styles.modalButtons}>
            {currentStep > 0 && !verificationSent && (
              <Button
                variant="secondary"
                size="medium"
                onClick={handleBack}
                disabled={isProcessing}
              >
                Back
              </Button>
            )}
            {currentStep < STEPS.length - 1 && !verificationSent && (
              <Button
                variant="primary"
                size="medium"
                onClick={handleNext}
                disabled={isProcessing || !isCurrentStepValid}
              >
                {isProcessing ? 'Processing...' : 'Next'}
              </Button>
            )}
            {currentStep === STEPS.length - 1 && !verificationSent && (
              <Button
                variant="primary"
                size="medium"
                onClick={handleComplete}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Complete'}
              </Button>
            )}
          </div>
        </div>
      </Box>
    </div>
  );
} 