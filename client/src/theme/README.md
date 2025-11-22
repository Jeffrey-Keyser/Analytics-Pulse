# Analytics Pulse Theme System

## Quick Start

### Using Theme in Components

```tsx
import { useThemeColors } from '../contexts/ThemeContext';

export function MyComponent() {
  const colors = useThemeColors();

  return (
    <div style={{
      backgroundColor: colors.background.secondary,
      color: colors.text.primary,
      border: `1px solid ${colors.border.primary}`,
    }}>
      <h2>Themed Content</h2>
      <p style={{ color: colors.text.secondary }}>Secondary text</p>
    </div>
  );
}
```

### Using Theme Hooks

```tsx
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggleButton() {
  const { mode, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      Current theme: {mode}
    </button>
  );
}
```

### Using CSS Variables

```css
.myComponent {
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
}

/* Dark mode specific styles */
:root[data-theme='dark'] .myComponent {
  box-shadow: var(--shadow-md);
}
```

## Available Hooks

### `useTheme()`
Returns the complete theme context:
```tsx
const { mode, colors, toggleTheme, setTheme } = useTheme();
```

### `useThemeColors()`
Returns just the color palette (most common use case):
```tsx
const colors = useThemeColors();
// colors.background.primary, colors.text.primary, etc.
```

### `useThemeMode()`
Returns just the current mode:
```tsx
const mode = useThemeMode(); // 'light' | 'dark'
```

## Color Palette Structure

```typescript
{
  background: {
    primary: string;    // Main background
    secondary: string;  // Cards, containers
    tertiary: string;   // Elevated surfaces
    elevated: string;   // Modals, dropdowns
  },
  text: {
    primary: string;    // Main text
    secondary: string;  // Muted text
    disabled: string;   // Disabled state
    inverse: string;    // Text on dark bg
  },
  border: {
    primary: string;
    secondary: string;
    focus: string;
  },
  primary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  },
  charts: {
    line1, line2, line3, line4, line5: string;
    bar1, bar2, bar3, bar4, bar5: string;
    grid: string;
    axis: string;
    tooltip: {
      background: string;
      text: string;
      border: string;
    }
  },
  shadows: {
    sm: string;
    md: string;
    lg: string;
  }
}
```

## CSS Variables

All available CSS variables:

### Backgrounds
- `--color-background-primary`
- `--color-background-secondary`
- `--color-background-tertiary`
- `--color-background-elevated`

### Text
- `--color-text-primary`
- `--color-text-secondary`
- `--color-text-disabled`
- `--color-text-inverse`

### Borders
- `--color-border-primary`
- `--color-border-secondary`
- `--color-border-focus`

### Primary Colors
- `--color-primary-main`
- `--color-primary-light`
- `--color-primary-dark`
- `--color-primary-contrast`

### Charts
- `--color-chart-line1` through `--color-chart-line3`
- `--color-chart-grid`
- `--color-chart-axis`
- `--color-chart-tooltip-bg`
- `--color-chart-tooltip-text`
- `--color-chart-tooltip-border`

### Shadows
- `--shadow-sm`
- `--shadow-md`
- `--shadow-lg`

## Theme System Flow

```
User clicks ThemeToggle
    ↓
toggleTheme() called
    ↓
Theme state updated
    ↓
localStorage updated
    ↓
DOM attributes updated
    ↓
CSS variables applied
    ↓
Components re-render with new colors
```

## Best Practices

1. **Use hooks over CSS when possible**: Hooks provide type safety and better IDE support

2. **Use `useThemeColors()` for simple color access**: More concise than full `useTheme()`

3. **Define styles inside component**: Access colors reactively
   ```tsx
   function MyComponent() {
     const colors = useThemeColors();
     const styles = { color: colors.text.primary }; // Re-computes on theme change
     return <div style={styles}>Content</div>;
   }
   ```

4. **Use CSS variables for global styles**: Better performance for frequently changing elements

5. **Test in both themes**: Always verify components work in light AND dark mode

6. **Respect accessibility**: Maintain WCAG AA contrast ratios in custom colors

## Accessibility

The theme system is designed with accessibility in mind:

- ✅ WCAG AA contrast ratios maintained
- ✅ Respects `prefers-reduced-motion`
- ✅ Respects `prefers-color-scheme`
- ✅ Focus states visible in both themes
- ✅ Smooth transitions (when motion allowed)

## Examples

### Card Component
```tsx
function Card({ title, children }) {
  const colors = useThemeColors();

  return (
    <div style={{
      background: colors.background.secondary,
      border: `1px solid ${colors.border.primary}`,
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: colors.shadows.sm,
    }}>
      <h3 style={{ color: colors.text.primary }}>{title}</h3>
      <div style={{ color: colors.text.secondary }}>{children}</div>
    </div>
  );
}
```

### Chart Component
```tsx
function MyChart({ data }) {
  const colors = useThemeColors();

  return (
    <ResponsiveContainer>
      <LineChart data={data}>
        <CartesianGrid stroke={colors.charts.grid} />
        <XAxis stroke={colors.charts.axis} />
        <YAxis stroke={colors.charts.axis} />
        <Line dataKey="value1" stroke={colors.charts.line1} />
        <Line dataKey="value2" stroke={colors.charts.line2} />
        <Tooltip
          contentStyle={{
            background: colors.charts.tooltip.background,
            border: `1px solid ${colors.charts.tooltip.border}`,
            color: colors.charts.tooltip.text,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

## Troubleshooting

**Q: My component isn't updating when theme changes**
A: Make sure you're using `useThemeColors()` inside your component, not outside

**Q: CSS variables aren't working**
A: Check that your CSS targets elements inside `:root[data-theme]` or uses the global variables

**Q: Theme isn't persisting**
A: Verify localStorage is enabled in the browser and check for console errors

**Q: Colors look wrong**
A: Ensure you're using the correct color path (e.g., `colors.background.primary`, not `colors.bg.primary`)
