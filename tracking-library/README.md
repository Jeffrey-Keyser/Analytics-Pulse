# Analytics Pulse Tracking Library

Privacy-focused, lightweight JavaScript tracking library for Analytics Pulse web analytics.

## Features

- **Privacy-First**: Respects Do Not Track, no cookies, anonymous visitor tracking
- **Lightweight**: Zero dependencies, minimal bundle size (~5KB minified)
- **Auto-tracking**: Automatic page view tracking with optional outbound link tracking
- **Offline Support**: Queues events when offline and retries automatically
- **TypeScript**: Full TypeScript support with comprehensive type definitions
- **Flexible**: Works with vanilla JS, React, Vue, Angular, and other frameworks

## Installation

### NPM

```bash
npm install @analytics-pulse/tracking-library
```

### Yarn

```bash
yarn add @analytics-pulse/tracking-library
```

### CDN

```html
<!-- Latest version -->
<script src="https://cdn.jsdelivr.net/npm/@analytics-pulse/tracking-library/dist/analytics-pulse.min.js"></script>

<!-- Specific version -->
<script src="https://cdn.jsdelivr.net/npm/@analytics-pulse/tracking-library@0.1.0/dist/analytics-pulse.min.js"></script>
```

## Quick Start

### Basic Usage

```html
<script>
  // Initialize with your API key
  const analytics = new AnalyticsPulse('your-api-key');

  // Track custom events
  analytics.trackEvent('button_click', {
    button: 'signup',
    location: 'header'
  });
</script>
```

### With Module Bundler

```typescript
import { AnalyticsPulse } from '@analytics-pulse/tracking-library';

// Initialize with configuration
const analytics = new AnalyticsPulse('your-api-key', {
  debug: true,
  autoTrack: true,
  trackOutboundLinks: true
});

// Track page views
analytics.trackPageView();

// Track custom events
analytics.trackEvent('purchase', {
  product: 'Pro Plan',
  price: 29.99,
  currency: 'USD'
});
```

## Configuration Options

```typescript
interface AnalyticsPulseConfig {
  // API endpoint URL (default: 'https://api.analytics-pulse.com/api/v1/events')
  endpoint?: string;

  // Enable debug logging (default: false)
  debug?: boolean;

  // Automatically track page views (default: true)
  autoTrack?: boolean;

  // Track outbound link clicks (default: false)
  trackOutboundLinks?: boolean;

  // Domains to exclude from outbound tracking (default: [])
  excludedDomains?: string[];

  // Custom properties to include with every event (default: {})
  customProps?: Record<string, string | number | boolean>;

  // Respect Do Not Track setting (default: true)
  respectDoNotTrack?: boolean;

  // Maximum retry attempts for failed requests (default: 3)
  maxRetries?: number;

  // Retry delay in milliseconds (default: 1000)
  retryDelay?: number;
}
```

## API Reference

### Constructor

```typescript
new AnalyticsPulse(apiKey: string, config?: AnalyticsPulseConfig)
```

Create a new Analytics Pulse instance with your API key and optional configuration.

**Example:**
```typescript
const analytics = new AnalyticsPulse('your-api-key', {
  debug: true,
  autoTrack: false
});
```

### trackPageView()

```typescript
trackPageView(customProps?: Record<string, string | number | boolean>): void
```

Manually track a page view event. This is called automatically if `autoTrack` is enabled.

**Example:**
```typescript
analytics.trackPageView({
  category: 'blog',
  author: 'john-doe'
});
```

### trackEvent()

```typescript
trackEvent(eventName: string, props?: Record<string, string | number | boolean>): void
```

Track a custom event with optional properties.

**Example:**
```typescript
analytics.trackEvent('video_play', {
  video_id: '12345',
  duration: 120,
  autoplay: false
});
```

### setDebug()

```typescript
setDebug(enabled: boolean): void
```

Enable or disable debug logging at runtime.

**Example:**
```typescript
analytics.setDebug(true);
```

### getConfig()

```typescript
getConfig(): Readonly<Required<AnalyticsPulseConfig>>
```

Get the current configuration.

**Example:**
```typescript
const config = analytics.getConfig();
console.log(config.debug); // true/false
```

## Common Use Cases

### React Integration

```tsx
import { useEffect } from 'react';
import { AnalyticsPulse } from '@analytics-pulse/tracking-library';

// Create instance outside component or use context
const analytics = new AnalyticsPulse('your-api-key');

function App() {
  useEffect(() => {
    // Track page views on route changes
    analytics.trackPageView();
  }, [window.location.pathname]);

  const handleButtonClick = () => {
    analytics.trackEvent('button_click', {
      button: 'cta',
      location: 'homepage'
    });
  };

  return <button onClick={handleButtonClick}>Sign Up</button>;
}
```

### Single Page Application (SPA)

```typescript
import { AnalyticsPulse } from '@analytics-pulse/tracking-library';

// Initialize without auto-tracking
const analytics = new AnalyticsPulse('your-api-key', {
  autoTrack: false
});

// Track page views on route changes
router.afterEach((to, from) => {
  analytics.trackPageView({
    route: to.path,
    previous_route: from.path
  });
});
```

### E-commerce Tracking

```typescript
// Track product views
analytics.trackEvent('product_view', {
  product_id: '12345',
  product_name: 'Blue T-Shirt',
  category: 'clothing',
  price: 29.99
});

// Track add to cart
analytics.trackEvent('add_to_cart', {
  product_id: '12345',
  quantity: 2,
  value: 59.98
});

// Track purchases
analytics.trackEvent('purchase', {
  order_id: 'ORD-12345',
  total: 89.97,
  items: 3,
  currency: 'USD'
});
```

### Form Tracking

```typescript
const form = document.querySelector('#signup-form');

form.addEventListener('submit', (e) => {
  analytics.trackEvent('form_submit', {
    form_name: 'signup',
    method: 'email'
  });
});

// Track form field interactions
form.querySelectorAll('input').forEach(input => {
  input.addEventListener('focus', () => {
    analytics.trackEvent('form_field_focus', {
      form_name: 'signup',
      field_name: input.name
    });
  });
});
```

## Privacy & Data Collection

Analytics Pulse is designed with privacy in mind:

- **No Cookies**: Uses localStorage/sessionStorage for visitor/session tracking
- **No Personal Data**: Doesn't collect names, emails, or other PII
- **Do Not Track**: Respects browser DNT settings by default
- **Anonymous IDs**: Visitor IDs are randomly generated UUIDs
- **No Cross-Site Tracking**: Each domain has isolated tracking

### What We Track

- Page URLs (without query parameters by default)
- Referrer information
- Screen dimensions
- User agent (for device/browser detection)
- Custom event data you provide

### What We DON'T Track

- Personal information (names, emails, etc.)
- Form inputs or user-entered data
- Cookies or other identifiers
- Cross-site activity

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Opera (latest)

**Note:** Requires support for:
- `fetch` API
- `localStorage` and `sessionStorage`
- ES2015 features

For older browsers, use polyfills or transpile the library.

## Development

### Setup

```bash
cd tracking-library
npm install
```

### Build

```bash
npm run build
```

This generates:
- `dist/analytics-pulse.js` - UMD build for browsers
- `dist/analytics-pulse.min.js` - Minified UMD build
- `dist/index.esm.js` - ES module build
- `dist/index.js` - CommonJS build
- `dist/*.d.ts` - TypeScript type definitions

### Test

```bash
npm test
npm run test:watch
npm run test:coverage
```

### Lint

```bash
npm run lint
```

## Size

- **Uncompressed**: ~15KB
- **Minified**: ~5KB
- **Minified + Gzipped**: ~2KB

## License

MIT

## Support

For issues, questions, or contributions, please visit:
https://github.com/Jeffrey-Keyser/Analytics-Pulse/issues
