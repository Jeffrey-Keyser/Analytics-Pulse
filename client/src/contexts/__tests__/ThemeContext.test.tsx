import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import { AnalyticsThemeProvider, useTheme, useThemeColors, useThemeMode } from '../ThemeContext';
import { darkTheme, lightTheme } from '../../theme/dark';

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset document attributes
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark-theme', 'light-theme');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('AnalyticsThemeProvider', () => {
    it('should render children', () => {
      render(
        <AnalyticsThemeProvider>
          <div>Test Child</div>
        </AnalyticsThemeProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should initialize with light theme by default', () => {
      render(
        <AnalyticsThemeProvider>
          <div>Test</div>
        </AnalyticsThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(document.documentElement.classList.contains('light-theme')).toBe(true);
    });

    it('should respect stored theme preference from localStorage', () => {
      localStorage.setItem('theme-mode', 'dark');

      render(
        <AnalyticsThemeProvider>
          <div>Test</div>
        </AnalyticsThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
    });

    it('should respect system preference when no stored preference', () => {
      const matchMediaMock = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }));

      window.matchMedia = matchMediaMock;

      render(
        <AnalyticsThemeProvider>
          <div>Test</div>
        </AnalyticsThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should persist theme changes to localStorage', () => {
      const TestComponent = () => {
        const { toggleTheme } = useTheme();
        return <button onClick={toggleTheme}>Toggle</button>;
      };

      render(
        <AnalyticsThemeProvider>
          <TestComponent />
        </AnalyticsThemeProvider>
      );

      const button = screen.getByText('Toggle');

      act(() => {
        button.click();
      });

      expect(localStorage.getItem('theme-mode')).toBe('dark');

      act(() => {
        button.click();
      });

      expect(localStorage.getItem('theme-mode')).toBe('light');
    });
  });

  describe('useTheme hook', () => {
    it('should provide theme mode and colors', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: AnalyticsThemeProvider,
      });

      expect(result.current.mode).toBe('light');
      expect(result.current.colors).toEqual(lightTheme);
      expect(typeof result.current.toggleTheme).toBe('function');
      expect(typeof result.current.setTheme).toBe('function');
    });

    it('should toggle theme mode', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: AnalyticsThemeProvider,
      });

      expect(result.current.mode).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('dark');
      expect(result.current.colors).toEqual(darkTheme);

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('light');
      expect(result.current.colors).toEqual(lightTheme);
    });

    it('should set specific theme mode', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: AnalyticsThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.mode).toBe('dark');
      expect(result.current.colors).toEqual(darkTheme);

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.mode).toBe('light');
      expect(result.current.colors).toEqual(lightTheme);
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('useThemeColors hook', () => {
    it('should provide current theme colors', () => {
      const { result } = renderHook(() => useThemeColors(), {
        wrapper: AnalyticsThemeProvider,
      });

      expect(result.current).toEqual(lightTheme);
    });

    it('should update colors when theme changes', () => {
      const { result: themeResult } = renderHook(() => useTheme(), {
        wrapper: AnalyticsThemeProvider,
      });

      const { result: colorsResult } = renderHook(() => useThemeColors(), {
        wrapper: AnalyticsThemeProvider,
      });

      expect(colorsResult.current).toEqual(lightTheme);

      act(() => {
        themeResult.current.toggleTheme();
      });

      expect(colorsResult.current).toEqual(darkTheme);
    });
  });

  describe('useThemeMode hook', () => {
    it('should provide current theme mode', () => {
      const { result } = renderHook(() => useThemeMode(), {
        wrapper: AnalyticsThemeProvider,
      });

      expect(result.current).toBe('light');
    });

    it('should update mode when theme changes', () => {
      const { result: themeResult } = renderHook(() => useTheme(), {
        wrapper: AnalyticsThemeProvider,
      });

      const { result: modeResult } = renderHook(() => useThemeMode(), {
        wrapper: AnalyticsThemeProvider,
      });

      expect(modeResult.current).toBe('light');

      act(() => {
        themeResult.current.toggleTheme();
      });

      expect(modeResult.current).toBe('dark');
    });
  });

  describe('Theme color values', () => {
    it('should have different colors for light and dark themes', () => {
      expect(lightTheme.background.primary).not.toBe(darkTheme.background.primary);
      expect(lightTheme.text.primary).not.toBe(darkTheme.text.primary);
      expect(lightTheme.border.primary).not.toBe(darkTheme.border.primary);
    });

    it('should have valid chart colors for both themes', () => {
      expect(lightTheme.charts.line1).toBeDefined();
      expect(lightTheme.charts.line2).toBeDefined();
      expect(lightTheme.charts.line3).toBeDefined();

      expect(darkTheme.charts.line1).toBeDefined();
      expect(darkTheme.charts.line2).toBeDefined();
      expect(darkTheme.charts.line3).toBeDefined();
    });

    it('should have tooltip colors for both themes', () => {
      expect(lightTheme.charts.tooltip.background).toBeDefined();
      expect(lightTheme.charts.tooltip.text).toBeDefined();
      expect(lightTheme.charts.tooltip.border).toBeDefined();

      expect(darkTheme.charts.tooltip.background).toBeDefined();
      expect(darkTheme.charts.tooltip.text).toBeDefined();
      expect(darkTheme.charts.tooltip.border).toBeDefined();
    });
  });

  describe('DOM updates', () => {
    it('should update document data-theme attribute', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: AnalyticsThemeProvider,
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should update document class names', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: AnalyticsThemeProvider,
      });

      expect(document.documentElement.classList.contains('light-theme')).toBe(true);
      expect(document.documentElement.classList.contains('dark-theme')).toBe(false);

      act(() => {
        result.current.toggleTheme();
      });

      expect(document.documentElement.classList.contains('light-theme')).toBe(false);
      expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
    });
  });
});
