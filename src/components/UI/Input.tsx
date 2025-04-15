"use client";

import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  layout?: 'vertical' | 'horizontal';
  nineSlice?: boolean;
}

const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  className, 
  layout = 'vertical',
  nineSlice = true,
  ...props 
}) => {
  return (
    <div className={`${styles.inputWrapper} ${layout === 'horizontal' ? styles.horizontal : ''}`}>
      <label className={styles.label}>{label}</label>
      <input
        className={`${styles.input} ${error ? styles.error : ''} ${nineSlice ? styles.nineSliceBase : ''} ${className || ''}`}
        {...props}
      />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
};

export default Input; 