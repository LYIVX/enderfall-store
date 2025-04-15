"use client";

import React, { useState, useEffect } from 'react';
import Toggle from '@/components/UI/Toggle';
import { FaSun, FaMoon, FaRegSun, FaPalette } from 'react-icons/fa';
import styles from './ThemeToggleExample.module.css';

const ThemeToggleExample = () => {
  // Light/Dark theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Accent theme state
  const [isAccentTheme, setIsAccentTheme] = useState(false);
  
  // Custom toggle state
  const [isCustomToggle, setIsCustomToggle] = useState(false);

  // Initialize theme based on user preference or system settings
  useEffect(() => {
    // Check if user has a theme preference stored
    const storedDarkMode = localStorage.getItem('darkMode') === 'true';
    const storedAccentTheme = localStorage.getItem('accentTheme') === 'true';
    
    // Set initial states
    setIsDarkMode(storedDarkMode);
    setIsAccentTheme(storedAccentTheme);
    
    // Apply themes
    if (storedDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    
    if (storedAccentTheme) {
      document.body.classList.add('accent-theme');
    } else {
      document.body.classList.remove('accent-theme');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    
    // Save preference
    localStorage.setItem('darkMode', String(newValue));
    
    // Apply theme
    if (newValue) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  // Toggle accent theme
  const toggleAccentTheme = () => {
    const newValue = !isAccentTheme;
    setIsAccentTheme(newValue);
    
    // Save preference
    localStorage.setItem('accentTheme', String(newValue));
    
    // Apply theme
    if (newValue) {
      document.body.classList.add('accent-theme');
    } else {
      document.body.classList.remove('accent-theme');
    }
  };

  return (
    <div className={styles.toggleExamples}>
      <h3>Theme Toggle Examples</h3>
      
      <div className={styles.toggleRow}>
        <label>Light/Dark Theme</label>
        <Toggle 
          isEnabled={isDarkMode}
          onChange={toggleDarkMode}
          enabledColor="var(--bg-dark)"
          disabledColor="var(--bg-light)"
          enabledIcon={<FaMoon color="#ffffff" />}
          disabledIcon={<FaSun color="#ffc107" />}
        />
      </div>
      
      <div className={styles.toggleRow}>
        <label>Accent Theme</label>
        <Toggle 
          isEnabled={isAccentTheme}
          onChange={toggleAccentTheme}
          enabledColor="var(--theme-secondary-color)"
          disabledColor="var(--theme-primary-color)"
          enabledIcon={<FaPalette />}
          disabledIcon={<FaPalette />}
        />
      </div>
      
      <div className={styles.toggleRow}>
        <label>Custom Toggle with Label</label>
        <Toggle 
          isEnabled={isCustomToggle}
          onChange={() => setIsCustomToggle(!isCustomToggle)}
          enabledColor="#4caf50"
          disabledColor="#9e9e9e"
          label={isCustomToggle ? "Enabled" : "Disabled"}
          size="small"
        />
      </div>
    </div>
  );
};

export default ThemeToggleExample; 