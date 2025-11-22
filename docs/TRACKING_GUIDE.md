# Tracking Guide

Complete guide to the Analytics-Pulse JavaScript tracking library.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration Options](#configuration-options)
- [Tracking Methods](#tracking-methods)
- [Session Management](#session-management)
- [UTM Campaign Tracking](#utm-campaign-tracking)
- [Event Batching](#event-batching)
- [Privacy Features](#privacy-features)
- [Framework Integration](#framework-integration)
- [TypeScript Support](#typescript-support)
- [Troubleshooting](#troubleshooting)

## Installation

### CDN (Easiest)

Add to your HTML `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@analytics-pulse/tracking-library"></script>
<script>
  const analytics = new AnalyticsPulse('your-api-key', {
    endpoint: 'https://api.yourdomain.com/api/v1/track',
    autoTrack: true
  });
</script>
```

###npm Package

```bash
npm install @analytics-pulse/tracking-library
```

### Yarn

```bash
yarn add @analytics-pulse/tracking-library
```

## Quick Start

### Basic Usage

```javascript
import { AnalyticsPulse } from '@analytics-pulse/tracking-library';

// Initialize
const analytics = new AnalyticsPulse('ap_your_api_key_here', {
  endpoint: 'https://api.yourdomain.com/api/v1/track',
  autoTrack: true  // Automatically track pageviews
});

// Track custom events
analytics.track('button_click', {
  button: 'signup',
  location: 'header'
});
```

### Minimal Setup

```javascript
// Simplest possible configuration
const analytics = new AnalyticsPulse('ap_your_api_key_here', {
  endpoint: 'https://api.yourdomain.com/api/v1/track'
});
```

## Configuration Options

Complete list of configuration options:

```typescript
interface AnalyticsPulseConfig {
  // Required
  endpoint: string;              // API endpoint URL

  // Tracking Options
  autoTrack?: boolean;           // Auto-track pageviews (default: false)
  trackOutboundLinks?: boolean;  // Track external link clicks (default: false)
  respectDoNotTrack?: boolean;   // Honor browser DNT setting (default: true)

  // Batching Options
  enableBatching?: boolean;      // Enable event batching (default: true)
  batchSize?: number;            // Events per batch (default: 10, max: 100)
  flushInterval?: number;        // Auto-flush interval in ms (default: 5000)

  // Session Options
  sessionTimeout?: number;       // Session timeout in ms (default: 1800000 = 30min)

  // Debug
  debug?: boolean;               // Enable console logging (default: false)
}
```

### Example with All Options

```javascript
const analytics = new AnalyticsPulse('ap_your_api_key_here', {
  // Required
  endpoint: 'https://api.yourdomain.com/api/v1/track',

  // Enable automatic tracking
  autoTrack: true,
  trackOutboundLinks: true,
  respectDoNotTrack: true,

  // Optimize performance with batching
  enableBatching: true,
  batchSize: 20,
  flushInterval: 10000,  // 10 seconds

  // Custom session timeout (default 30 minutes)
  sessionTimeout: 3600000,  // 1 hour

  // Enable debug logging
  debug: process.env.NODE_ENV === 'development'
});
```

## Tracking Methods

### Track Pageview

Manually track a pageview:

```javascript
// Simple pageview
analytics.trackPageView();

// Pageview with custom properties
analytics.trackPageView({
  category: 'blog',
  author: 'john-doe',
  tags: ['javascript', 'tutorial']
});
```

**Auto-tracking**: If `autoTrack: true`, pageviews are automatically tracked on:
- Initial page load
- `popstate` events (browser back/forward)
- `pushState` and `replaceState` (for SPAs)

### Track Custom Events

Track any user interaction:

```javascript
// Simple event
analytics.track('button_click');

// Event with properties
analytics.track('button_click', {
  button: 'signup',
  location: 'header',
  variant: 'primary'
});

// E-commerce event
analytics.track('purchase', {
  order_id: 'ORD-12345',
  total: 299.99,
  currency: 'USD',
  items: [
    { id: 'PROD-1', name: 'Widget', price: 149.99, quantity: 1 },
    { id: 'PROD-2', name: 'Gadget', price: 149.99, quantity: 1 }
  ],
  shipping: 'express',
  payment_method: 'credit_card'
});
```

**Property Limits**:
- Max size: 5KB per event
- Properties must be JSON-serializable
- Avoid circular references

### Track Outbound Links

Automatically track clicks on external links:

```javascript
const analytics = new AnalyticsPulse('your-api-key', {
  endpoint: 'https://api.yourdomain.com/api/v1/track',
  trackOutboundLinks: true  // Enable automatic tracking
});
```

**Manual tracking**:

```javascript
document.querySelectorAll('a[href^="http"]').forEach(link => {
  link.addEventListener('click', (e) => {
    analytics.track('outbound_link_click', {
      url: e.target.href,
      text: e.target.textContent,
      location: 'footer'
    });
  });
});
```

### Alias for `track()`

`trackEvent()` is an alias for `track()`:

```javascript
// These are equivalent
analytics.track('form_submit', { form: 'contact' });
analytics.trackEvent('form_submit', { form: 'contact' });
```

## Session Management

Analytics-Pulse automatically manages sessions:

### How Sessions Work

1. **Session ID**: Generated on first visit (UUID)
2. **Storage**: Stored in `sessionStorage` (cleared when tab closes)
3. **Timeout**: Inactive for 30 minutes (default) = new session
4. **Visitor ID**: Persistent across sessions (stored in `localStorage`)

### Session Lifecycle

```
User visits site
  ↓
New session created (session_id: uuid-1)
  ↓
User browses pages (same session_id)
  ↓
User inactive for 30 minutes
  ↓
Next pageview creates new session (session_id: uuid-2)
```

### Custom Session Timeout

```javascript
const analytics = new AnalyticsPulse('your-api-key', {
  endpoint: 'https://api.yourdomain.com/api/v1/track',
  sessionTimeout: 600000  // 10 minutes
});
```

### Session Storage

Analytics-Pulse stores these items:

**sessionStorage** (cleared on tab close):
- `analytics-pulse-session-id`: Current session UUID
- `analytics-pulse-session-start`: Session start timestamp
- `analytics-pulse-last-activity`: Last activity timestamp
- `analytics-pulse-utm-params`: Original UTM parameters (first-touch attribution)

**localStorage** (persistent):
- `analytics-pulse-visitor-id`: Visitor UUID (anonymous identifier)

### Clear Session Data

```javascript
// Clear session (user will get new session on next event)
sessionStorage.removeItem('analytics-pulse-session-id');
sessionStorage.removeItem('analytics-pulse-session-start');
sessionStorage.removeItem('analytics-pulse-last-activity');

// Clear visitor (user will get new visitor ID)
localStorage.removeItem('analytics-pulse-visitor-id');

// Clear UTM params (next pageview will capture new UTMs)
sessionStorage.removeItem('analytics-pulse-utm-params');
```

## UTM Campaign Tracking

Analytics-Pulse automatically extracts and tracks UTM parameters from URLs.

### Supported Parameters

```
https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale&utm_term=widget&utm_content=banner_a
```

- **utm_source**: Traffic source (google, facebook, newsletter)
- **utm_medium**: Marketing medium (cpc, email, social, organic)
- **utm_campaign**: Campaign name (spring_sale, product_launch)
- **utm_term**: Paid search keywords
- **utm_content**: Ad/link variant (banner_a, link_b)

### First-Touch Attribution

UTM parameters from the **first pageview** are preserved for the entire session:

```
1. User lands on: example.com/?utm_source=google&utm_campaign=spring_sale
   → UTM params saved to sessionStorage

2. User navigates to: example.com/products (no UTM params in URL)
   → Original UTM params still tracked

3. User navigates to: example.com/checkout (no UTM params in URL)
   → Original UTM params still tracked
```

This ensures accurate campaign attribution across the entire user journey.

### Override UTM Parameters

To force new UTM parameters mid-session:

```javascript
// Manually set UTM params
sessionStorage.setItem('analytics-pulse-utm-params', JSON.stringify({
  utm_source: 'email',
  utm_medium: 'newsletter',
  utm_campaign: 'summer_sale'
}));
```

### Access Current UTM Params

```javascript
const utmParams = JSON.parse(
  sessionStorage.getItem('analytics-pulse-utm-params') || '{}'
);

console.log(utmParams);
// { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'spring_sale', ... }
```

## Event Batching

Batching reduces network requests and improves performance.

### How Batching Works

Instead of sending each event immediately:

```
Event 1 → HTTP Request
Event 2 → HTTP Request
Event 3 → HTTP Request
```

Events are queued and sent together:

```
Event 1 → Queue
Event 2 → Queue
Event 3 → Queue
  ↓
Single HTTP Request (3 events)
```

### Configuration

```javascript
const analytics = new AnalyticsPulse('your-api-key', {
  endpoint: 'https://api.yourdomain.com/api/v1/track',
  enableBatching: true,
  batchSize: 10,        // Send when 10 events queued
  flushInterval: 5000   // Or every 5 seconds
});
```

### Flush Triggers

Batched events are sent when:
1. **Batch size reached**: Queue has `batchSize` events
2. **Interval elapsed**: `flushInterval` milliseconds pass
3. **Page unload**: User navigates away or closes tab

### Manual Flush

Force immediate send:

```javascript
// Track events
analytics.track('event_1');
analytics.track('event_2');
analytics.track('event_3');

// Manually flush queue
analytics.flush();
```

### Disable Batching

For debugging or real-time requirements:

```javascript
const analytics = new AnalyticsPulse('your-api-key', {
  endpoint: 'https://api.yourdomain.com/api/v1/track',
  enableBatching: false  // Send each event immediately
});
```

## Privacy Features

Analytics-Pulse is built for privacy compliance.

### Do Not Track (DNT)

Respects browser DNT setting by default:

```javascript
const analytics = new AnalyticsPulse('your-api-key', {
  endpoint: 'https://api.yourdomain.com/api/v1/track',
  respectDoNotTrack: true  // Default
});
```

When DNT is enabled (`navigator.doNotTrack === '1'`):
- No events are sent
- No data is stored
- User is not tracked

### No Cookies

Analytics-Pulse uses `localStorage` and `sessionStorage` instead of cookies:
- ✅ No cookie consent banners required
- ✅ GDPR/CCPA friendly
- ✅ Not blocked by cookie blockers

### Anonymous Identifiers

- **Visitor ID**: Random UUID (not tied to personal information)
- **IP Address**: Hashed (SHA-256) on server before storage
- **No fingerprinting**: No canvas, audio, or WebGL fingerprinting

### Data Minimization

Only collected data:
- URL, referrer
- User agent (browser, OS, device type)
- Screen/viewport dimensions
- Language, timezone
- Geographic location (country, city) via IP
- Custom event properties (you control)

**NOT collected**:
- Personal information (name, email, etc.)
- Form data
- Passwords or sensitive inputs
- Precise geolocation (GPS)

## Framework Integration

### React

#### Using Hooks

```typescript
// src/hooks/useAnalytics.ts
import { useEffect } from 'react';
import { AnalyticsPulse } from '@analytics-pulse/tracking-library';

const analytics = new AnalyticsPulse(
  import.meta.env.VITE_ANALYTICS_API_KEY,
  {
    endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT,
    autoTrack: false  // Manual tracking for SPA
  }
);

export function useAnalytics() {
  return analytics;
}

export function usePageView() {
  const analytics = useAnalytics();

  useEffect(() => {
    analytics.trackPageView();
  }, []);
}

// Component usage
function ProductPage() {
  usePageView();  // Track pageview on mount

  const analytics = useAnalytics();

  const handleAddToCart = () => {
    analytics.track('add_to_cart', {
      product_id: 'PROD-123',
      price: 49.99
    });
  };

  return <button onClick={handleAddToCart}>Add to Cart</button>;
}
```

#### Context Provider

```typescript
// src/contexts/AnalyticsContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { AnalyticsPulse } from '@analytics-pulse/tracking-library';

const AnalyticsContext = createContext<AnalyticsPulse | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const analytics = new AnalyticsPulse(
    import.meta.env.VITE_ANALYTICS_API_KEY,
    {
      endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT,
      autoTrack: true,
      debug: import.meta.env.DEV
    }
  );

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
}

// App.tsx
import { AnalyticsProvider } from './contexts/AnalyticsContext';

function App() {
  return (
    <AnalyticsProvider>
      <YourApp />
    </AnalyticsProvider>
  );
}
```

### Vue 3

```typescript
// src/plugins/analytics.ts
import { AnalyticsPulse } from '@analytics-pulse/tracking-library';
import { App } from 'vue';

const analytics = new AnalyticsPulse(
  process.env.VUE_APP_ANALYTICS_API_KEY,
  {
    endpoint: process.env.VUE_APP_ANALYTICS_ENDPOINT,
    autoTrack: false
  }
);

export default {
  install(app: App) {
    app.config.globalProperties.$analytics = analytics;

    // Track route changes
    app.config.globalProperties.$router.afterEach(() => {
      analytics.trackPageView();
    });
  }
};

// main.ts
import analyticsPlugin from './plugins/analytics';

app.use(analyticsPlugin);

// Component usage
export default {
  methods: {
    handleClick() {
      this.$analytics.track('button_click', { button: 'signup' });
    }
  }
};
```

### Next.js

```typescript
// lib/analytics.ts
import { AnalyticsPulse } from '@analytics-pulse/tracking-library';

export const analytics = new AnalyticsPulse(
  process.env.NEXT_PUBLIC_ANALYTICS_API_KEY!,
  {
    endpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT!,
    autoTrack: false
  }
);

// pages/_app.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { analytics } from '../lib/analytics';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Track initial pageview
    analytics.trackPageView();

    // Track route changes
    const handleRouteChange = () => {
      analytics.trackPageView();
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return <Component {...pageProps} />;
}
```

### Angular

```typescript
// src/app/services/analytics.service.ts
import { Injectable } from '@angular/core';
import { AnalyticsPulse } from '@analytics-pulse/tracking-library';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private analytics: AnalyticsPulse;

  constructor(private router: Router) {
    this.analytics = new AnalyticsPulse(
      environment.analyticsApiKey,
      {
        endpoint: environment.analyticsEndpoint,
        autoTrack: false
      }
    );

    // Track route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.analytics.trackPageView();
      });
  }

  track(eventName: string, properties?: Record<string, any>) {
    this.analytics.track(eventName, properties);
  }
}

// Component usage
export class ProductComponent {
  constructor(private analyticsService: AnalyticsService) {}

  handlePurchase() {
    this.analyticsService.track('purchase', {
      product_id: this.product.id,
      price: this.product.price
    });
  }
}
```

## TypeScript Support

Full TypeScript support with type definitions:

```typescript
import { AnalyticsPulse, AnalyticsPulseConfig } from '@analytics-pulse/tracking-library';

// Typed configuration
const config: AnalyticsPulseConfig = {
  endpoint: 'https://api.yourdomain.com/api/v1/track',
  autoTrack: true,
  enableBatching: true,
  batchSize: 10,
  respectDoNotTrack: true,
  debug: false
};

const analytics = new AnalyticsPulse('your-api-key', config);

// Typed event properties
interface ButtonClickEvent {
  button: string;
  location: string;
  variant?: string;
}

const properties: ButtonClickEvent = {
  button: 'signup',
  location: 'header',
  variant: 'primary'
};

analytics.track('button_click', properties);
```

## Troubleshooting

### Events Not Appearing

**Check API key**:
```javascript
// Verify API key format (should start with 'ap_')
console.log(apiKey.startsWith('ap_'));
```

**Check network requests**:
1. Open browser DevTools → Network tab
2. Filter by "track"
3. Look for requests to your endpoint
4. Check response status (should be 200/201)

**Check console for errors**:
```javascript
const analytics = new AnalyticsPulse('your-api-key', {
  endpoint: 'https://api.yourdomain.com/api/v1/track',
  debug: true  // Enable debug logging
});
```

### CORS Errors

If you see CORS errors, verify your API server allows requests from your domain:

```javascript
// Server should respond with these headers:
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-API-Key
```

### Rate Limiting

If you hit rate limits (10,000 req/hour):

```
Error: 429 Too Many Requests
```

**Solutions**:
1. Enable batching to reduce requests:
```javascript
const analytics = new AnalyticsPulse('your-api-key', {
  endpoint: 'https://api.yourdomain.com/api/v1/track',
  enableBatching: true,
  batchSize: 50,
  flushInterval: 10000
});
```

2. Generate multiple API keys for different environments
3. Contact support for higher limits

### Events Lost on Page Unload

Browsers may cancel requests when navigating away. Solutions:

**Use batching** (automatic `keepalive: true`):
```javascript
const analytics = new AnalyticsPulse('your-api-key', {
  endpoint: 'https://api.yourdomain.com/api/v1/track',
  enableBatching: true
});
```

**Manual `sendBeacon` (for critical events)**:
```javascript
window.addEventListener('beforeunload', () => {
  navigator.sendBeacon(
    'https://api.yourdomain.com/api/v1/track/event',
    JSON.stringify({
      api_key: 'your-api-key',
      event_type: 'page_exit',
      url: window.location.href
    })
  );
});
```

### TypeScript Errors

If you encounter module resolution errors:

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "moduleResolution": "node16",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

## Best Practices

### 1. Use Environment Variables

Never hardcode API keys:

```javascript
// ❌ Bad
const analytics = new AnalyticsPulse('ap_abc123...');

// ✅ Good
const analytics = new AnalyticsPulse(process.env.ANALYTICS_API_KEY);
```

### 2. Enable Batching in Production

Reduce network overhead:

```javascript
const analytics = new AnalyticsPulse(apiKey, {
  endpoint: analyticsEndpoint,
  enableBatching: process.env.NODE_ENV === 'production',
  batchSize: 20,
  flushInterval: 10000
});
```

### 3. Respect User Privacy

```javascript
const analytics = new AnalyticsPulse(apiKey, {
  endpoint: analyticsEndpoint,
  respectDoNotTrack: true,  // Always respect DNT
  autoTrack: true  // Only track necessary interactions
});
```

### 4. Track Meaningful Events

Focus on business-critical interactions:

```javascript
// ✅ Good - meaningful business events
analytics.track('purchase', { order_id, total, items });
analytics.track('signup', { plan: 'pro' });
analytics.track('feature_used', { feature: 'export' });

// ❌ Bad - too granular or meaningless
analytics.track('mouse_move', { x, y });
analytics.track('scroll', { position: 50 });
analytics.track('hover', { element: 'button' });
```

### 5. Limit Event Properties

Keep properties under 5KB:

```javascript
// ✅ Good - concise properties
analytics.track('search', {
  query: 'widgets',
  results_count: 42,
  filter: 'newest'
});

// ❌ Bad - excessive data
analytics.track('search', {
  query: 'widgets',
  all_results: [...],  // Large array
  user_history: [...], // Not necessary
  dom_snapshot: document.body.innerHTML  // Way too much
});
```

## API Reference

### Constructor

```typescript
new AnalyticsPulse(apiKey: string, config: AnalyticsPulseConfig)
```

### Methods

#### `trackPageView(properties?: Record<string, any>): void`

Track a pageview.

```javascript
analytics.trackPageView();
analytics.trackPageView({ category: 'blog' });
```

#### `track(eventName: string, properties?: Record<string, any>): void`

Track a custom event.

```javascript
analytics.track('button_click', { button: 'signup' });
```

#### `trackEvent(eventName: string, properties?: Record<string, any>): void`

Alias for `track()`.

```javascript
analytics.trackEvent('form_submit', { form: 'contact' });
```

#### `flush(): void`

Manually flush the event queue (only relevant when batching is enabled).

```javascript
analytics.flush();
```

## Support

- **Documentation**: [https://github.com/Jeffrey-Keyser/Analytics-Pulse](https://github.com/Jeffrey-Keyser/Analytics-Pulse)
- **Issues**: [GitHub Issues](https://github.com/Jeffrey-Keyser/Analytics-Pulse/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Jeffrey-Keyser/Analytics-Pulse/discussions)

---

Now you're ready to track anything with Analytics-Pulse! 🎯
