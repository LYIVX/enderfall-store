"use client";

import React from 'react';
import { useTheme } from './ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';
import Button from '@/components/UI/Button';
import styles from './ThemeToggle.module.css';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Button 
    onClick={toggleTheme} 
    className={styles.themeToggle} 
    aria-label="Toggle theme"
    variant="info"
    nineSlice={true}
    size="medium"
    >
      {theme === 'dark' ? <FaSun className={styles.sunIcon} /> : <FaMoon className={styles.moonIcon} />}
    </Button>
  );
};

export default ThemeToggle; 