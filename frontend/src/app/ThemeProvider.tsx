// src/app/ThemeProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme ? savedTheme === 'dark' : prefersDark;

    setDarkMode(initialTheme);

    // Apply both class & attribute data-theme
    const themeName = initialTheme ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', initialTheme);
    document.documentElement.setAttribute('data-theme', themeName);

  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      const themeName = newMode ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', newMode);
      document.documentElement.setAttribute('data-theme', themeName);

      localStorage.setItem('theme', themeName);
      return newMode;
    });
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}