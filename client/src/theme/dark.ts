/**
 * Dark Theme Definition for Analytics Pulse
 *
 * Colors are chosen to meet WCAG AA contrast requirements for accessibility
 * Chart colors are optimized for dark backgrounds with high contrast
 */

export interface ThemeColors {
  // Background colors
  background: {
    primary: string;      // Main background
    secondary: string;    // Card/container backgrounds
    tertiary: string;     // Elevated surfaces
    elevated: string;     // Modals, dropdowns
  };

  // Text colors
  text: {
    primary: string;      // Main text
    secondary: string;    // Muted text
    disabled: string;     // Disabled text
    inverse: string;      // Text on dark backgrounds
  };

  // Border and divider colors
  border: {
    primary: string;
    secondary: string;
    focus: string;
  };

  // Semantic colors
  primary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };

  success: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };

  error: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };

  warning: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };

  info: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };

  // Chart colors (optimized for dark backgrounds)
  charts: {
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    line5: string;
    bar1: string;
    bar2: string;
    bar3: string;
    bar4: string;
    bar5: string;
    grid: string;
    axis: string;
    tooltip: {
      background: string;
      text: string;
      border: string;
    };
  };

  // Shadows
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

/**
 * Dark theme color palette
 */
export const darkTheme: ThemeColors = {
  background: {
    primary: '#1a1a1a',
    secondary: '#2d2d2d',
    tertiary: '#3a3a3a',
    elevated: '#424242',
  },

  text: {
    primary: '#e0e0e0',
    secondary: '#b0b0b0',
    disabled: '#707070',
    inverse: '#1a1a1a',
  },

  border: {
    primary: '#404040',
    secondary: '#333333',
    focus: '#4a9eff',
  },

  primary: {
    main: '#4a9eff',
    light: '#7ab8ff',
    dark: '#2b7fd9',
    contrast: '#ffffff',
  },

  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
    contrast: '#ffffff',
  },

  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
    contrast: '#ffffff',
  },

  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
    contrast: '#000000',
  },

  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
    contrast: '#ffffff',
  },

  // Chart colors optimized for dark backgrounds
  charts: {
    line1: '#4a9eff',    // Blue
    line2: '#66bb6a',    // Green
    line3: '#ffa726',    // Orange
    line4: '#ab47bc',    // Purple
    line5: '#26c6da',    // Cyan
    bar1: '#4a9eff',
    bar2: '#66bb6a',
    bar3: '#ffa726',
    bar4: '#ab47bc',
    bar5: '#26c6da',
    grid: '#404040',
    axis: '#b0b0b0',
    tooltip: {
      background: '#424242',
      text: '#e0e0e0',
      border: '#555555',
    },
  },

  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
    md: '0 4px 8px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
  },
};

/**
 * Light theme color palette
 */
export const lightTheme: ThemeColors = {
  background: {
    primary: '#ffffff',
    secondary: '#f8f9fa',
    tertiary: '#f0f0f0',
    elevated: '#ffffff',
  },

  text: {
    primary: '#333333',
    secondary: '#666666',
    disabled: '#999999',
    inverse: '#ffffff',
  },

  border: {
    primary: '#e0e0e0',
    secondary: '#f0f0f0',
    focus: '#1976d2',
  },

  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
    contrast: '#ffffff',
  },

  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
    contrast: '#ffffff',
  },

  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
    contrast: '#ffffff',
  },

  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
    contrast: '#000000',
  },

  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
    contrast: '#ffffff',
  },

  // Chart colors optimized for light backgrounds
  charts: {
    line1: '#1976d2',    // Blue
    line2: '#388e3c',    // Green
    line3: '#f57c00',    // Orange
    line4: '#7b1fa2',    // Purple
    line5: '#0097a7',    // Cyan
    bar1: '#1976d2',
    bar2: '#388e3c',
    bar3: '#f57c00',
    bar4: '#7b1fa2',
    bar5: '#0097a7',
    grid: '#e0e0e0',
    axis: '#666666',
    tooltip: {
      background: '#ffffff',
      text: '#333333',
      border: '#e0e0e0',
    },
  },

  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.05)',
    md: '0 4px 8px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.15)',
  },
};
