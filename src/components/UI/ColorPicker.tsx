"use client";

import React from 'react';
import styles from './ColorPicker.module.css';

interface ColorPickerProps {
  label: string;
  error?: string;
  layout?: 'vertical' | 'horizontal';
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ 
  label, 
  error, 
  layout = 'vertical',
  color,
  onChange,
  disabled,
  id,
  name,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`${styles.colorPickerWrapper} ${layout === 'horizontal' ? styles.horizontal : ''}`}>
      <label className={styles.label}>{label}</label>
      <div className={styles.colorContainer}>
        <input
          type="color"
          className={`${styles.colorPicker} ${error ? styles.error : ''}`}
          value={color}
          onChange={handleChange}
          disabled={disabled}
          id={id}
          name={name}
        />
        <input 
          type="text"
          className={styles.colorText}
          value={color}
          onChange={handleChange}
          placeholder="#000000"
          disabled={disabled}
        />
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
};

export default ColorPicker; 