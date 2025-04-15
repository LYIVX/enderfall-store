"use client";

import React from 'react';
import { useTheme } from './ThemeContext';
import Toggle from '@/components/UI/Toggle';
import { FaSun, FaMoon } from 'react-icons/fa';

export const LightDarkToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Toggle 
      isEnabled={theme === 'dark'}
      onChange={toggleTheme}
      enabledColor="var(--theme-secondary-color)"
      disabledColor="var(--theme-primary-color)"
      enabledIcon={<FaMoon color="var(--theme-secondary-color)" />}
      disabledIcon={<FaSun color="var(--theme-primary-color)" />}
    />
  );
};

export default LightDarkToggle; 