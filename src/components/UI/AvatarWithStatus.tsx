"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useUserStatus } from '@/components/Auth/UserStatusContext';
import styles from './AvatarWithStatus.module.css';
import { UserStatusValue, UserStatusRecord } from '@/types/user-status';
import StatusIndicator from './StatusIndicator';

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
  // Get the full myStatus record and userStatuses map from the context
  const { userStatuses, myStatus } = useUserStatus();

  // *** DEBUG LOGGING START ***
  useEffect(() => {
    console.log(`[AvatarWithStatus] userId: ${userId}, username: ${username}`);
    console.log(`[AvatarWithStatus] Received userStatuses:`, userStatuses);
    console.log(`[AvatarWithStatus] myStatus user_id: ${myStatus?.user_id}`);
  }, [userId, username, userStatuses, myStatus]); // Log when props or context change
  // *** DEBUG LOGGING END ***

  // Determine if the current avatar is for the logged-in user
  const isCurrentUser = myStatus?.user_id === userId;

  // Get the relevant status record
  const statusRecord: UserStatusRecord | undefined | null = isCurrentUser ? myStatus : userStatuses[userId];

  // *** DEBUG LOGGING START ***
  useEffect(() => {
    console.log(`[AvatarWithStatus] Found statusRecord for ${userId}:`, statusRecord);
  }, [userId, statusRecord]); // Log when statusRecord changes
  // *** DEBUG LOGGING END ***

  // Extract the status value, defaulting to 'offline'
  const statusValue: UserStatusValue = statusRecord?.status || 'offline';

  // Get status text for tooltip
  const getStatusTextForTooltip = () => {
    switch (statusValue) {
      case 'online': return 'Online';
      case 'do_not_disturb': return 'Do Not Disturb';
      case 'away': return 'Away';
      case 'offline':
      default: return 'Offline';
    }
  };

  const [statusText, setStatusText] = useState<string>(getStatusTextForTooltip());

  // Update tooltip text if status changes
  useEffect(() => {
    setStatusText(getStatusTextForTooltip());
  }, [statusValue]);

  // Set CSS class based on size
  const sizeClass = styles[size];

  // Determine the size prop for StatusIndicator based on Avatar size
  const indicatorSize = 
    size === 'xsmall' || size === 'small' ? 'small' :
    size === 'large' || size === 'xlarge' ? 'medium' :
    'medium'; // Default or adjust as needed

  return (
    <div
      className={`${styles.avatarContainer} ${sizeClass} ${className}`}
      title={showStatusTooltip ? `${username} - ${statusText}` : undefined}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={`${username}'s profile picture`}
          width={64} // Consider making these dynamic based on size prop
          height={64} // Consider making these dynamic based on size prop
          className={styles.avatar}
          priority={size === 'large' || size === 'xlarge'}
        />
      ) : (
        <div className={styles.defaultAvatar}>
          {username && username[0] ? username[0].toUpperCase() : 'U'}
        </div>
      )}
      {showStatusIndicator && (
        <StatusIndicator status={statusValue} size={indicatorSize} className={styles.statusPosition} />
      )}
    </div>
  );
};

export default AvatarWithStatus;