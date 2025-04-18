"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useUserStatus } from '@/components/Auth/UserStatusContext';
import { UserStatusValue } from '@/types/user-status';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCircle, FaMinusCircle, FaPowerOff, FaChevronDown, FaQuestionCircle, FaClock, FaTimesCircle, FaPlusCircle, FaDotCircle } from 'react-icons/fa';
import styles from './StatusSwitcher.module.css';
import Button from './Button';

interface StatusSwitcherProps {
  className?: string;
}

const StatusSwitcher: React.FC<StatusSwitcherProps> = ({ className = '' }) => {
  const { myStatus, setMyStatus } = useUserStatus(); 
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentStatusValue: UserStatusValue = myStatus?.status || 'offline';

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
  
  const getStatusIcon = (status: UserStatusValue) => {
    switch (status) {
      case 'online':
        return <FaCircle className={styles.onlineIcon} />;
      case 'do_not_disturb':
        return <FaMinusCircle className={styles.dndIcon} />;
      case 'away': 
        return <FaClock className={styles.awayIcon} />; 
      case 'offline':
        return <FaDotCircle className={styles.offlineIcon} />;
      default: 
        return <FaDotCircle className={styles.offlineIcon} />;
    }
  };
  
  const getStatusText = (status: UserStatusValue) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'do_not_disturb':
        return 'Do Not Disturb';
      case 'away': 
        return 'Away';
      case 'offline':
        return 'Offline';
      default: 
        return 'Unknown';
    }
  };
  
  const handleStatusChange = async (status: UserStatusValue) => {
    await setMyStatus(status, true); 
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
            {getStatusIcon(currentStatusValue)} 
            <span className={styles.statusText}>{getStatusText(currentStatusValue)}</span>
          </span>
          <FaChevronDown className={`${styles.caretIcon} ${isOpen ? styles.caretOpen : ''}`} />
        </div>
      </Button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className={`${styles.dropdown} pixel-font`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.statusOptions}>
              <button 
                className={`${styles.statusOption} ${currentStatusValue === 'online' ? styles.active : ''}`}
                onClick={() => handleStatusChange('online')}
              >
                <FaCircle className={styles.onlineIcon} />
                <span>Online</span>
              </button>
              
              <button 
                className={`${styles.statusOption} ${currentStatusValue === 'do_not_disturb' ? styles.active : ''}`}
                onClick={() => handleStatusChange('do_not_disturb')}
              >
                <FaMinusCircle className={styles.dndIcon} />
                <span>Do Not Disturb</span>
              </button>

              <button 
                className={`${styles.statusOption} ${currentStatusValue === 'away' ? styles.active : ''}`}
                onClick={() => handleStatusChange('away')}
              >
                <FaClock className={styles.awayIcon} /> 
                <span>Away</span>
              </button>
              
              <button 
                className={`${styles.statusOption} ${currentStatusValue === 'offline' ? styles.active : ''}`}
                onClick={() => handleStatusChange('offline')}
              >
                <FaDotCircle className={styles.offlineIcon} />
                <span>Offline</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatusSwitcher;