"use client";

import React from 'react';
import styles from './Toggle.module.css';

interface ToggleProps {
  isEnabled: boolean;
  onChange: () => void;
  enabledColor?: string;
  disabledColor?: string;
  enabledIcon?: React.ReactNode;
  disabledIcon?: React.ReactNode;
  label?: string;
  labelPosition?: 'left' | 'right';
  size?: 'small' | 'medium' | 'large';
}

const Toggle: React.FC<ToggleProps> = ({
  isEnabled,
  onChange,
  enabledColor = 'var(--theme-secondary-color)',
  disabledColor = 'var(--theme-primary-color)',
  enabledIcon,
  disabledIcon,
  label,
  labelPosition = 'right',
  size = 'medium',
}) => {
  const toggleStyle = {
    backgroundColor: isEnabled ? enabledColor : disabledColor,
  };

  return (
    <div className={`${styles.toggleContainer} ${styles[size]} ${styles[labelPosition + 'Label']}`}>
      {label && labelPosition === 'left' && (
        <span className={styles.label}>{label}</span>
      )}
      
      <button 
        type="button"
        className={`${styles.toggle} ${isEnabled ? styles.enabled : styles.disabled}`}
        onClick={onChange}
        aria-checked={isEnabled}
        role="switch"
        style={toggleStyle}
      >
        <div className={styles.slider}>
          <div className={styles.iconContainer}>
            {isEnabled ? enabledIcon : disabledIcon}
          </div>
        </div>
      </button>
      
      {label && labelPosition === 'right' && (
        <span className={styles.label}>{label}</span>
      )}
    </div>
  );
};

export default Toggle; 