/**
 * Theme Context for Analytics Pulse
 *
 * Provides theme state and colors to all components
 * Integrates with @jeffrey-keyser/personal-ui-kit ThemeProvider
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { darkTheme, lightTheme, ThemeColors } from '../theme/dark';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Get initial theme mode from localStorage or system preference
 */
function getInitialTheme(): ThemeMode {
  // Check localStorage first
  const stored = localStorage.getItem('theme-mode');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  // Fall back to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

/**
 * Analytics Pulse Theme Provider
 *
 * Provides theme colors and mode to all child components
 * Persists theme preference to localStorage
 * Respects system preference on initial load
 */
export function AnalyticsThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(getInitialTheme);

  // Update document class and localStorage when theme changes
  useEffect(() => {
    const root = document.documentElement;

    // Update data-theme attribute for CSS
    root.setAttribute('data-theme', mode);

    // Update class for compatibility
    if (mode === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }

    // Persist to localStorage
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't set a preference
      const storedPreference = localStorage.getItem('theme-mode');
      if (!storedPreference) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const colors = mode === 'dark' ? darkTheme : lightTheme;

  const value: ThemeContextValue = {
    mode,
    colors,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 *
 * @returns Theme context value with mode, colors, and toggle function
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to get just the theme colors (most common use case)
 *
 * @returns Current theme colors
 */
export function useThemeColors(): ThemeColors {
  const { colors } = useTheme();
  return colors;
}

/**
 * Hook to get just the theme mode
 *
 * @returns Current theme mode
 */
export function useThemeMode(): ThemeMode {
  const { mode } = useTheme();
  return mode;
}
