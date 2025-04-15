"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useUserStatus } from '@/components/Auth/UserStatusContext';
import { UserStatusType } from '@/types/user-status';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCircle, FaMinusCircle, FaPowerOff, FaChevronDown } from 'react-icons/fa';
import styles from './StatusSwitcher.module.css';
import Button from './Button';

interface StatusSwitcherProps {
  className?: string;
}

const StatusSwitcher: React.FC<StatusSwitcherProps> = ({ className = '' }) => {
  const { myStatus, setMyStatus } = useUserStatus();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const getStatusIcon = (status: UserStatusType) => {
    switch (status) {
      case 'online':
        return <FaCircle className={styles.onlineIcon} />;
      case 'do_not_disturb':
        return <FaMinusCircle className={styles.dndIcon} />;
      case 'offline':
        return <FaPowerOff className={styles.offlineIcon} />;
      default:
        return <FaCircle className={styles.onlineIcon} />;
    }
  };
  
  const getStatusText = (status: UserStatusType) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'do_not_disturb':
        return 'Do Not Disturb';
      case 'offline':
        return 'Offline';
      default:
        return 'Online';
    }
  };
  
  const handleStatusChange = async (status: UserStatusType) => {
    await setMyStatus(status);
    setIsOpen(false);
  };
  
  return (
    <div ref={dropdownRef} className={`${styles.statusSwitcher} ${className}`} data-open={isOpen ? "true" : "false"}>
      <Button 
        className={styles.statusButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change status"
        nineSlice
        variant="standard"
        data-active={isOpen ? "true" : "false"}
      >
        <div className={styles.buttonContent}>
          <span className={styles.statusInfo}>
            {getStatusIcon(myStatus)}
            <span className={styles.statusText}>{getStatusText(myStatus)}</span>
          </span>
          <FaChevronDown className={styles.caretIcon} />
        </div>
      </Button>
      
      {isOpen && (
        <div className={`${styles.dropdown} pixel-font`}>
          <div className={styles.statusOptions}>
            <button 
              className={`${styles.statusOption} ${myStatus === 'online' ? styles.active : ''}`}
              onClick={() => handleStatusChange('online')}
            >
              <FaCircle className={styles.onlineIcon} />
              <span>Online</span>
            </button>
            
            <button 
              className={`${styles.statusOption} ${myStatus === 'do_not_disturb' ? styles.active : ''}`}
              onClick={() => handleStatusChange('do_not_disturb')}
            >
              <FaMinusCircle className={styles.dndIcon} />
              <span>Do Not Disturb</span>
            </button>
            
            <button 
              className={`${styles.statusOption} ${myStatus === 'offline' ? styles.active : ''}`}
              onClick={() => handleStatusChange('offline')}
            >
              <FaPowerOff className={styles.offlineIcon} />
              <span>Offline</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusSwitcher; 