/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

type Mode = 'light' | 'dark';

interface ThemeContextType {
  mode: Mode;
  isYorubaTheme: boolean;
  toggleMode: () => void;
  toggleYorubaTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const stored = localStorage.getItem('oja_theme_mode');
      if (stored === 'light' || stored === 'dark') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [isYorubaTheme, setIsYorubaTheme] = useState<boolean>(() => {
    try {
      return localStorage.getItem('oja_theme_yoruba') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('oja_theme_mode', mode);
    } catch {}
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    if (isYorubaTheme) {
      root.classList.add('theme-yoruba');
    } else {
      root.classList.remove('theme-yoruba');
    }
    try {
      localStorage.setItem('oja_theme_yoruba', isYorubaTheme ? 'true' : 'false');
    } catch {}
  }, [isYorubaTheme]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const toggleYorubaTheme = () => {
    setIsYorubaTheme((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ mode, isYorubaTheme, toggleMode, toggleYorubaTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
