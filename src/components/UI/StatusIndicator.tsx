"use client";

import React from 'react';
import { UserStatusValue } from '@/types/user-status';
import styles from './StatusIndicator.module.css';
import { FaCircle, FaMinusCircle, FaPowerOff, FaClock, FaTimesCircle, FaPlusCircle, FaDotCircle } from 'react-icons/fa';

interface StatusIndicatorProps {
  status: UserStatusValue;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showDot?: boolean;
  showText?: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'medium',
  className = '',
  showDot = true,
  showText = false,
}) => {

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'large':
        return styles.large;
      case 'medium':
      default:
        return styles.medium;
    }
  };

  // Function to get status text - Keep this if showText is true
  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'do_not_disturb':
        return 'Do Not Disturb';
      case 'away':
        return 'Away';
      default:
        return 'Unknown';
    }
  };

  // Determine icon and class based on status
  let icon;
  let statusClass;

  switch (status) {
    case 'online':
      icon = <FaCircle />;
      statusClass = styles.online;
      break;
    case 'do_not_disturb':
      icon = <FaMinusCircle />;
      statusClass = styles.doNotDisturb;
      break;
    case 'away':
      icon = <FaClock />;
      statusClass = styles.away;
      break;
    case 'offline':
    default:
      icon = <FaDotCircle />;
      statusClass = styles.offline;
      break;
  }

  return (
    <div className={`${styles.statusContainer} ${className}`}>
      {showDot && (
        <div className={`${styles.statusIndicator} ${statusClass} ${getSizeClass()}`}>
          {icon} {/* Render the determined icon */}
        </div>
      )}
      {showText && <span className={styles.statusText}>{getStatusText()}</span>}
    </div>
  );
};

export default StatusIndicator;