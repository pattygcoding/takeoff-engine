import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'takeoff_engine_theme';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // ignore
    }
    // Default to dark mode across the entire application
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setDarkMode = () => setTheme('dark');
  const setLightMode = () => setTheme('light');

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setDarkMode, setLightMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      isDark: false,
      toggleTheme: () => {},
      setDarkMode: () => {},
      setLightMode: () => {},
    };
  }
  return context;
}
