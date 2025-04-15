"use client";

import React from 'react';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import { useAuth } from '@/components/Auth/AuthContext';
import styles from './ui-demo.module.css';

export default function AvatarDemo() {
  const { user } = useAuth();
  
  // All available size variants
  const sizes = ['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge', 'xxxlarge', 'xxxxlarge', 'xxxxxlarge'] as const;
  
  return (
    <div className={styles.demoSection}>
      <h2 className={styles.sectionTitle}>Avatar With Status</h2>
      
      {user ? (
        <>
          <p className={styles.demoDescription}>
            Display user avatars with online status indicators. Available in multiple sizes.
          </p>
          
          <div className={styles.avatarGrid}>
            {sizes.map(size => (
              <div key={size} className={styles.avatarItem}>
                <AvatarWithStatus
                  userId={user.id}
                  avatarUrl={user.user_metadata?.avatar_url || null}
                  username={user.user_metadata?.username || user.email || 'User'}
                  size={size}
                />
                <span className={styles.avatarSize}>{size}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className={styles.loggedOut}>
          Please log in to see avatar demos with your own profile picture.
        </p>
      )}
    </div>
  );
} 