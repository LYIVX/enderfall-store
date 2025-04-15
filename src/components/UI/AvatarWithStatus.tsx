"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useUserStatus } from '@/components/Auth/UserStatusContext';
import styles from './AvatarWithStatus.module.css';

interface AvatarWithStatusProps {
  userId: string;
  avatarUrl?: string | null;
  username: string;
  size?: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge' | 'xxxlarge' | 'xxxxlarge' | 'xxxxxlarge' | 'xxxxxxlarge';
  className?: string;
  /** Whether to show a tooltip with status information */
  showStatusTooltip?: boolean;
  /** Whether to show the status indicator dot */
  showStatusIndicator?: boolean;
}

const AvatarWithStatus: React.FC<AvatarWithStatusProps> = ({
  userId,
  avatarUrl,
  username,
  size = 'medium',
  className = '',
  showStatusTooltip = false,
  showStatusIndicator = true,
}) => {
  const { userStatuses, inactivityThreshold } = useUserStatus();
  const userStatus = userStatuses[userId] || 'offline';
  const [statusText, setStatusText] = useState<string>('');

  // Set CSS class based on size
  const sizeClass = styles[size];

  // Set CSS class based on status
  const statusClass = 
    userStatus === 'online' ? styles.online :
    userStatus === 'do_not_disturb' ? styles.doNotDisturb :
    styles.offline;
  
  // Update status text for tooltip
  useEffect(() => {
    switch (userStatus) {
      case 'online':
        setStatusText('Online');
        break;
      case 'do_not_disturb':
        setStatusText('Do Not Disturb');
        break;
      case 'offline':
        setStatusText('Offline');
        break;
      default:
        setStatusText('Unknown');
    }
  }, [userStatus]);

  return (
    <div 
      className={`${styles.avatarContainer} ${sizeClass} ${className}`}
      title={showStatusTooltip ? `${username} - ${statusText}` : undefined}
    >
      {avatarUrl ? (
        <Image 
          src={avatarUrl}
          alt={`${username}'s profile picture`}
          width={64}
          height={64}
          className={styles.avatar}
        />
      ) : (
        <div className={styles.defaultAvatar}>
          {username && username[0] ? username[0].toUpperCase() : 'U'}
        </div>
      )}
      {showStatusIndicator && (
        <div className={`${styles.statusIndicator} ${statusClass}`}>
          {userStatus === 'do_not_disturb' && <div className={styles.doNotDisturbLine} />}
        </div>
      )}
    </div>
  );
};

export default AvatarWithStatus; 