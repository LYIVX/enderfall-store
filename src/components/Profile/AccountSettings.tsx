"use client";

import React, { useState, useRef, useEffect } from 'react';
import Button from '@/components/UI/Button';
import styles from './AccountSettings.module.css';
import Modal from '@/components/UI/Modal';
import Input from '@/components/UI/Input';
import { useAuth } from '@/components/Auth/AuthContext';
import { FaUser, FaBox, FaCreditCard, FaCube, FaDiscord, FaGoogle, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaEye, FaEyeSlash, FaUpload, FaPalette, FaBell, FaEnvelope, FaKey, FaTrash, FaUserCircle } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import AccentThemeToggle from '@/components/Theme/AccentThemeToggle';
import LightDarkToggle from '@/components/Theme/LightDarkToggle';
import Toggle from '@/components/UI/Toggle';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';

interface AccountSettingsProps {
  email: string;
  username: string;
}

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

const AccountSettings: React.FC<AccountSettingsProps> = ({ email, username }) => {
  const { updateProfile, updatePassword, profile } = useAuth();
  const router = useRouter();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [discordNotifications, setDiscordNotifications] = useState(true);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previousAvatars, setPreviousAvatars] = useState<{path: string, url: string}[]>([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch previous avatars on component mount
  useEffect(() => {
    if (profile?.id) {
      fetchPreviousAvatars();
    }
  }, [profile?.id]);

  // Function to fetch previous avatars from Supabase storage
  const fetchPreviousAvatars = async () => {
    if (!profile?.id) return;
    
    setIsLoadingAvatars(true);
    try {
      // List all files in the user's avatar folder
      const { data, error } = await supabase
        .storage
        .from('avatars')
        .list(`${profile.id}`, {
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (error) {
        console.error('Error fetching previous avatars:', error);
        return;
      }
      
      // Get URLs for each avatar
      if (data && data.length > 0) {
        const avatarsWithUrls = data.map(file => {
          const path = `${profile.id}/${file.name}`;
          const { data: urlData } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(path);
          
          return {
            path,
            url: urlData.publicUrl
          };
        });
        
        setPreviousAvatars(avatarsWithUrls);
      }
    } catch (err) {
      console.error('Error in fetchPreviousAvatars:', err);
    } finally {
      setIsLoadingAvatars(false);
    }
  };

  // Function to switch to a previous profile picture
  const switchToAvatar = async (avatarUrl: string) => {
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Add cache busting parameter to URL
      const timestamp = new Date().getTime();
      const newAvatarUrl = `${avatarUrl}?t=${timestamp}`;
      
      // Update the profile with the selected avatar URL
      const updatedProfile = await updateProfile({ 
        avatar_url: newAvatarUrl 
      });
      
      if (!updatedProfile) {
        setError('Failed to update profile picture');
        return;
      }
      
      setSuccess('Profile picture updated successfully');
      
      // Force refresh the page to show updated profile picture
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error('Error switching avatar:', err);
      setError('Failed to update profile picture');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Function to delete a profile picture from storage
  const deleteAvatar = async (path: string) => {
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Delete the file from Supabase storage
      const { error } = await supabase
        .storage
        .from('avatars')
        .remove([path]);
      
      if (error) {
        console.error('Error deleting avatar:', error);
        setError('Failed to delete profile picture');
        return;
      }
      
      // If the deleted avatar is the current one, set to default
      if (profile?.avatar_url && profile.avatar_url.includes(path.split('/').pop() || '')) {
        await updateProfile({ avatar_url: null });
      }
      
      // Refetch the list of avatars
      await fetchPreviousAvatars();
      
      setSuccess('Profile picture deleted successfully');
    } catch (err) {
      console.error('Error deleting avatar:', err);
      setError('Failed to delete profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  // Get password strength
  const passwordStrength = calculatePasswordStrength(newPassword);
  const passwordStrengthClass = passwordStrength.score === 0 ? '' : 
                               passwordStrength.score === 1 ? styles.weak :
                               passwordStrength.score === 2 ? styles.fair :
                               passwordStrength.score === 3 ? styles.good : styles.strong;

  const handleUsernameChange = async () => {
    try {
      if (!newUsername.trim()) {
        setError('Username cannot be empty');
        return;
      }
      await updateProfile({ username: newUsername });
      setSuccess('Username updated successfully');
      setIsUsernameModalOpen(false);
      setNewUsername('');
    } catch (err) {
      setError('Failed to update username');
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setError('All fields are required');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }
      if (newPassword.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }
      if (calculatePasswordStrength(newPassword).score < 2) {
        setError('Password is too weak');
        return;
      }

      // Verify current password with Supabase
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: currentPassword,
      });

      if (signInError) {
        setError('Current password is incorrect');
        return;
      }

      // If current password is correct, proceed with password update
      await updatePassword(currentPassword, newPassword);
      
      // Sign out the user
      await supabase.auth.signOut();
      
      // Show success message briefly before redirecting
      setSuccess('Password updated successfully. Please log in with your new password.');
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError('Failed to update password');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }
    
    // Clear any previous error/success messages
    setError(null);
    setSuccess(null);
    
    // Set the file for upload
    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      setError('No avatar file selected');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get file extension
      const fileExt = avatarFile.name.split('.').pop();
      // Create unique filename with user ID and timestamp
      const fileName = `${profile?.id}/${Date.now()}.${fileExt}`;
      
      // Upload to Supabase storage with upsert option
      const { data, error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        setError('Failed to upload avatar');
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Add cache busting parameter to URL
      const timestamp = new Date().getTime();
      const avatarUrl = `${publicUrlData.publicUrl}?t=${timestamp}`;

      // Update the profile with the new avatar URL
      const updatedProfile = await updateProfile({ 
        avatar_url: avatarUrl 
      });

      if (!updatedProfile) {
        setError('Failed to update profile with new avatar');
        return;
      }

      // Update local state
      setAvatarPreview(null);
      setAvatarFile(null);
      setSuccess('Avatar uploaded successfully');
      
      // Refresh the previous avatars list
      await fetchPreviousAvatars();
      
      // Force refresh the page to show updated profile picture
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error('Error in handleAvatarUpload:', err);
      setError('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className={styles.settingsHeader}>
        <h3 className={styles.settingsTitle}>Account Settings</h3>
      </div>
      
      <div className={styles.settingsContent}>
        {/* Status messages */}
        {error && (
          <div className={styles.statusMessage} style={{ color: 'var(--theme-error-color)' }}>
            <FaExclamationTriangle /> {error}
          </div>
        )}
        {success && (
          <div className={styles.statusMessage} style={{ color: 'var(--theme-success-color)' }}>
            <FaCheckCircle /> {success}
          </div>
        )}
      
        <div className={styles.settingsGroup}>          
          <div className={styles.accountAction}>
            <div className={styles.actionInfo}>
              <div className={styles.avatarPreview}>
                {avatarPreview ? (
                  <AvatarWithStatus
                    userId={profile?.id || 'preview'}
                    avatarUrl={avatarPreview}
                    username={username}
                    size="large"
                  />
                ) : profile?.avatar_url ? (
                  <AvatarWithStatus
                    userId={profile?.id}
                    avatarUrl={profile.avatar_url}
                    username={username}
                    size="large"
                  />
                ) : (
                  <FaUser />
                )}
              </div>
              <div>
                <div className={styles.actionTitle}>Profile Picture</div>
                <div className={styles.actionDescription}>
                  {avatarPreview ? 'Confirm your new profile picture' : 
                   profile?.avatar_url ? 'Click to change your profile picture' : 'Upload a profile picture'}
                </div>
              </div>
            </div>
            <div className={styles.avatarUpload}>
              <input
                type="file"
                id="avatar"
                ref={fileInputRef}
                className={styles.uploadInput}
                accept="image/*"
                onChange={handleAvatarChange}
              />
              {avatarFile ? (
                <div className={styles.confirmButtons}>
                  <Button 
                    variant="primary" 
                    size="small" 
                    onClick={handleAvatarUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Confirm'}
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="small" 
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="primary" 
                  size="small" 
                  className={styles.uploadButton} 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <FaUpload /> {profile?.avatar_url ? 'Change' : 'Upload'}
                </Button>
              )}
            </div>
          </div>
          
          {/* Previous Avatars Section */}
          {previousAvatars.length > 0 && (
            <div className={styles.accountAction}>
              <div className={styles.actionInfo} style={{ width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <div className={styles.actionTitle}>Previous Profile Pictures</div>
                  <div className={styles.actionDescription}>
                    Click on a profile picture to switch back to it
                  </div>
                  
                  <div className={styles.previousAvatars}>
                    {isLoadingAvatars ? (
                      <div>Loading previous avatars...</div>
                    ) : (
                      previousAvatars.map((avatar, index) => (
                        <div key={index} className={styles.previousAvatarItem}>
                          <div className={styles.previousAvatarImage}>
                            <AvatarWithStatus
                              userId={profile?.id || 'prev'}
                              avatarUrl={avatar.url}
                              username={username}
                              size="medium"
                            />
                          </div>
                          <div className={styles.previousAvatarActions}>
                            <Button 
                              variant="primary" 
                              size="small" 
                              onClick={() => switchToAvatar(avatar.url)}
                              disabled={isUploading}
                            >
                              Use
                            </Button>
                            <Button 
                              variant="danger" 
                              size="small" 
                              onClick={() => deleteAvatar(avatar.path)}
                              disabled={isUploading}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.accountAction}>
            <div className={styles.actionInfo}>
              <span className={styles.actionIcon}><FaUserCircle /></span>
              <div>
                <div className={styles.actionTitle}>Username</div>
                <div className={styles.actionDescription}>{username}</div>
              </div>
            </div>
            <Button variant="primary" size="small" onClick={() => setIsUsernameModalOpen(true)}>Change</Button>
          </div>

          <div className={styles.accountAction}>
            <div className={styles.actionInfo}>
              <span className={styles.actionIcon}><FaEnvelope /></span>
              <div>
                <div className={styles.actionTitle}>Email Address</div>
                <div className={styles.actionDescription}>{email}</div>
              </div>
            </div>
            <Button variant="primary" size="small">Change</Button>
          </div>
          
          <div className={styles.accountAction}>
            <div className={styles.actionInfo}>
              <span className={styles.actionIcon}><FaKey /></span>
              <div>
                <div className={styles.actionTitle}>Password</div>
                <div className={styles.actionDescription}>Last changed 3 months ago</div>
              </div>
            </div>
            <Button variant="primary" size="small" onClick={() => setIsPasswordModalOpen(true)}>Change</Button>
          </div>
        </div>

        <div className={styles.settingsGroup}>
          <h4 className={styles.groupTitle}>Notifications</h4>
          <div className={styles.accountAction}>
            <div className={styles.actionInfo}>
              <span className={styles.actionIcon}><FaEnvelope /></span>
              <div>
                <div className={styles.actionTitle}>Email Notifications</div>
                <div className={styles.actionDescription}>Receive important updates via email</div>
              </div>
            </div>
            <Toggle 
              isEnabled={emailNotifications}
              onChange={() => setEmailNotifications(!emailNotifications)}
            />
          </div>
          <div className={styles.accountAction}>
            <div className={styles.actionInfo}>
              <span className={styles.actionIcon}><FaDiscord /></span>
              <div>
                <div className={styles.actionTitle}>Discord Notifications</div>
                <div className={styles.actionDescription}>Receive updates via Discord</div>
              </div>
            </div>
            <Toggle 
              isEnabled={discordNotifications}
              onChange={() => setDiscordNotifications(!discordNotifications)}
            />
          </div>
        </div>
        
        <div className={styles.settingsGroup}>
          <h4 className={styles.groupTitle}>Appearance</h4>
          <div className={styles.accountAction}>
            <div className={styles.actionInfo}>
              <span className={styles.actionIcon}><FaPalette /></span>
              <div>
                <div className={styles.actionTitle}>Theme</div>
                <div className={styles.actionDescription}>Choose between light and dark mode</div>
              </div>
            </div>
            <LightDarkToggle />
          </div>
          
          <div className={styles.accountAction}>
            <div className={styles.actionInfo}>
              <span className={styles.actionIcon}><FaPalette /></span>
              <div>
                <div className={styles.actionTitle}>Accent Theme</div>
                <div className={styles.actionDescription}>Use the accent color as primary theme color</div>
              </div>
            </div>
            <AccentThemeToggle />
          </div>
        </div>
        
        <div className={styles.dangerZone}>
          <h4 className={styles.dangerTitle}>Danger Zone</h4>
          <div className={styles.accountAction}>
            <div className={styles.actionInfo}>
              <span className={styles.actionIcon}><FaTrash style={{ color: 'var(--theme-error-color)' }} /></span>
              <div>
                <div className={styles.actionTitle}>Delete Account</div>
                <div className={styles.actionDescription}>This action cannot be undone</div>
              </div>
            </div>
            <Button variant="danger" size="small">Delete</Button>
          </div>
        </div>
        
        <div className={styles.settingsButtons}>
          <Button variant="primary">Save Changes</Button>
        </div>
      </div>

      {/* Username Change Modal */}
      <Modal
        isOpen={isUsernameModalOpen}
        onClose={() => {
          setIsUsernameModalOpen(false);
          setError(null);
          setSuccess(null);
        }}
        title="Change Username"
      >
        <div className={styles.modalContent}>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <Input
            label="New Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Enter new username"
          />
          <div className={styles.modalButtons}>
            <Button variant="secondary" onClick={() => setIsUsernameModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUsernameChange}>Update Username</Button>
          </div>
        </div>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setError(null);
          setSuccess(null);
        }}
        title="Change Password"
      >
        <div className={styles.modalContent}>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <div className={styles.passwordContainer}>
            <Input
              type={showPasswords ? 'text' : 'password'}
              label="Current Password"
              value={currentPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPasswords(!showPasswords)}
              aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
            >
              {showPasswords ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          
          <Input
            type={showPasswords ? 'text' : 'password'}
            label="New Password"
            value={newPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
          
          <div className={styles.passwordStrength}>
            Strength: {passwordStrength.label}
            <div className={styles.passwordStrengthMeter}>
              <div className={`${styles.passwordStrengthIndicator} ${passwordStrengthClass}`}></div>
            </div>
          </div>
          
          <Input
            type={showPasswords ? 'text' : 'password'}
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
          
          <div className={styles.modalButtons}>
            <Button variant="secondary" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handlePasswordChange}>Update Password</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AccountSettings; 