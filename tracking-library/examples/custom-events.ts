/**
 * Custom Event Tracking Examples
 *
 * This file demonstrates the enhanced custom event tracking API
 * implemented in Phase 3 (Issue #18)
 */

import { AnalyticsPulse } from '../src/core';

// Initialize Analytics Pulse
const analytics = new AnalyticsPulse('your-api-key', {
  debug: true,
  autoTrack: true
});

// ==========================================
// Basic Event Tracking
// ==========================================

// Simple event (no data)
analytics.track('button_click');

// Alternative method name (both work identically)
analytics.trackEvent('button_click');

// ==========================================
// Event with Flat Data
// ==========================================

// Event with simple properties
analytics.track('signup_completed', {
  plan: 'premium',
  trial: false,
  source: 'homepage'
});

// ==========================================
// E-commerce Tracking
// ==========================================

// Track a purchase
analytics.track('purchase', {
  product_id: '123',
  price: 29.99,
  currency: 'USD',
  category: 'electronics',
  quantity: 2
});

// Track product views
analytics.track('product_viewed', {
  product_id: '456',
  product_name: 'Wireless Headphones',
  price: 79.99,
  in_stock: true
});

// Track cart actions
analytics.track('add_to_cart', {
  product_id: '789',
  quantity: 1,
  price: 19.99
});

// ==========================================
// Nested Object Support
// ==========================================

// Track complex data structures
analytics.track('form_submitted', {
  form_id: 'contact-form',
  fields: {
    name: { value: 'John Doe', valid: true },
    email: { value: 'john@example.com', valid: true },
    message: { value: 'Hello!', valid: true }
  },
  validation: {
    passed: true,
    errors: []
  },
  metadata: {
    page: '/contact',
    duration: 45000,
    attempts: 1
  }
});

// User profile data
analytics.track('profile_updated', {
  user: {
    id: '12345',
    name: 'Jane Smith',
    email: 'jane@example.com',
    preferences: {
      theme: 'dark',
      notifications: true,
      language: 'en'
    },
    subscription: {
      plan: 'pro',
      status: 'active',
      expires: '2024-12-31'
    }
  }
});

// ==========================================
// Array Support
// ==========================================

// Track with array data
analytics.track('search_performed', {
  query: 'wireless headphones',
  results_count: 42,
  filters: ['price_low_to_high', 'in_stock'],
  categories: ['electronics', 'audio', 'accessories'],
  results: [
    { id: '1', name: 'Product A', price: 59.99 },
    { id: '2', name: 'Product B', price: 79.99 },
    { id: '3', name: 'Product C', price: 99.99 }
  ]
});

// ==========================================
// Real-World Analytics Scenarios
// ==========================================

// Feature usage tracking
analytics.track('feature_used', {
  feature_name: 'export_data',
  feature_category: 'data_management',
  user_role: 'admin',
  export_format: 'csv',
  record_count: 1500
});

// Error tracking
analytics.track('error_occurred', {
  error_type: 'validation_error',
  error_message: 'Invalid email format',
  field: 'email',
  page: '/signup',
  user_input: 'invalid-email'
});

// Performance tracking
analytics.track('page_load_time', {
  page: '/dashboard',
  load_time_ms: 1234,
  resource_count: 42,
  cache_hit: true,
  server_time_ms: 234,
  render_time_ms: 1000
});

// Video interaction
analytics.track('video_played', {
  video_id: 'tutorial-intro',
  video_title: 'Getting Started Tutorial',
  duration_seconds: 180,
  current_time: 0,
  quality: '1080p',
  autoplay: false
});

// ==========================================
// Validation Examples
// ==========================================

// ✅ Valid event names (alphanumeric, underscores, hyphens)
analytics.track('button_click');          // valid
analytics.track('signup-completed');      // valid
analytics.track('event123');              // valid
analytics.track('USER_LOGGED_IN');        // valid

// ❌ Invalid event names (will be rejected with error log)
// analytics.track('button click');       // INVALID - contains space
// analytics.track('signup@completed');   // INVALID - contains @
// analytics.track('event#123');          // INVALID - contains #
// analytics.track('user.logged.in');     // INVALID - contains .

// ==========================================
// Data Size Limits
// ==========================================

// ✅ Data under 5KB - will succeed
analytics.track('small_event', {
  description: 'This is a small event with reasonable data size'
});

// ❌ Data over 5KB - will be rejected with error log
// const largeData = { data: 'x'.repeat(6000) };
// analytics.track('large_event', largeData);  // INVALID - exceeds 5KB

// ==========================================
// Automatic Context
// ==========================================

// All events automatically include:
// - sessionId: Current session identifier
// - visitorId: Unique visitor identifier
// - url: Current page URL
// - userAgent: Browser user agent
// - timestamp: Event timestamp

console.log('Session ID:', analytics.getSessionId());
console.log('Visitor ID:', analytics.getVisitorId());

// ==========================================
// Debug Mode
// ==========================================

// Enable debug mode to see validation errors and event details
analytics.setDebug(true);

// This will log validation error in console
analytics.track('invalid event name');  // Error logged

// This will log success message
analytics.track('valid_event', { key: 'value' });  // Success logged

// ==========================================
// Best Practices
// ==========================================

// 1. Use descriptive, snake_case event names
analytics.track('checkout_completed', { /* ... */ });

// 2. Keep data size reasonable (well under 5KB)
analytics.track('button_click', { button: 'signup', location: 'header' });

// 3. Use consistent property names across events
analytics.track('product_viewed', { product_id: '123', price: 29.99 });
analytics.track('product_purchased', { product_id: '123', price: 29.99 });

// 4. Include relevant context in your data
analytics.track('error_occurred', {
  error_type: 'network_error',
  page: window.location.pathname,
  timestamp: Date.now()
});

// 5. Test in debug mode first
analytics.setDebug(true);
analytics.track('test_event', { test: true });
