"use client";

import React from 'react';
import { UserStatusType } from '@/types/user-status';
import styles from './StatusIndicator.module.css';

interface StatusIndicatorProps {
  status: UserStatusType;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showDot?: boolean;
  showText?: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  className = '',
  size = 'medium',
  showDot = true,
  showText = false,
}) => {
  const getStatusClass = () => {
    switch (status) {
      case 'online':
        return styles.online;
      case 'do_not_disturb':
        return styles.doNotDisturb;
      case 'offline':
        return styles.offline;
      default:
        return styles.offline;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'do_not_disturb':
        return 'Do Not Disturb';
      case 'offline':
        return 'Offline';
      default:
        return 'Offline';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'medium':
        return styles.medium;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  return (
    <div className={`${styles.statusContainer} ${className}`}>
      {showDot && (
        <div className={`${styles.statusIndicator} ${getStatusClass()} ${getSizeClass()}`}>
          {status === 'do_not_disturb' && <div className={styles.doNotDisturbLine} />}
        </div>
      )}
      {showText && <span className={styles.statusText}>{getStatusText()}</span>}
    </div>
  );
};

export default StatusIndicator; 