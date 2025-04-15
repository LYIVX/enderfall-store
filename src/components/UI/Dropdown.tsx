"use client";

import React from 'react';
import styles from './Dropdown.module.css';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: DropdownOption[] | string[];
  error?: string;
  layout?: 'vertical' | 'horizontal';
}

const Dropdown: React.FC<DropdownProps> = ({ 
  label, 
  options, 
  error, 
  className,
  layout = 'vertical',
  ...props 
}) => {
  return (
    <div className={`${styles.dropdownWrapper} ${layout === 'horizontal' ? styles.horizontal : ''}`}>
      <label className={styles.label}>{label}</label>
      <select 
        className={`${styles.dropdown} ${error ? styles.error : ''} ${className || ''}`}
        {...props}
      >
        {options.map((option, index) => {
          if (typeof option === 'string') {
            return (
              <option key={index} value={option}>
                {option}
              </option>
            );
          } else {
            return (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            );
          }
        })}
      </select>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
};

export default Dropdown; 