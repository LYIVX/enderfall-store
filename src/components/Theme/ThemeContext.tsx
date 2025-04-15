"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'dark' | 'light';

export interface ThemeContextType {
  theme: ThemeMode;
  isAccentTheme: boolean;
  toggleTheme: () => void;
  toggleAccentTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isAccentTheme: false,
  toggleTheme: () => {},
  toggleAccentTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [isAccentTheme, setIsAccentTheme] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as ThemeMode;
    const storedAccentTheme = localStorage.getItem('accentTheme');
    
    if (storedTheme) {
      setTheme(storedTheme);
    }
    
    if (storedAccentTheme) {
      setIsAccentTheme(storedAccentTheme === 'true');
    }
    
    setIsInitialized(true);
  }, []);

  // Apply theme classes to body
  useEffect(() => {
    if (!isInitialized) return;
    
    document.body.classList.remove('light-theme', 'dark-theme', 'accent-theme');
    document.body.classList.add(`${theme}-theme`);
    
    if (isAccentTheme) {
      document.body.classList.add('accent-theme');
    }
    
    localStorage.setItem('theme', theme);
    localStorage.setItem('accentTheme', String(isAccentTheme));
    
  }, [theme, isAccentTheme, isInitialized]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const toggleAccentTheme = () => {
    setIsAccentTheme(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ theme, isAccentTheme, toggleTheme, toggleAccentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext; 