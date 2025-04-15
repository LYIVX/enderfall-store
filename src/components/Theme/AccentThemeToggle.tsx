"use client";

import React from 'react';
import { useTheme } from './ThemeContext';
import Toggle from '@/components/UI/Toggle';
import { FaPalette } from 'react-icons/fa';

export const AccentThemeToggle: React.FC = () => {
  const { isAccentTheme, toggleAccentTheme } = useTheme();
  
  return (
    <Toggle 
      isEnabled={isAccentTheme}
      onChange={toggleAccentTheme}
      enabledColor="var(--theme-primary-color)"
      disabledColor="var(--theme-primary-color)"
      enabledIcon={<FaPalette color="var(--theme-primary-color)" />}
      disabledIcon={<FaPalette color="var(--theme-primary-color)" />}
    />
  );
};

export default AccentThemeToggle; 