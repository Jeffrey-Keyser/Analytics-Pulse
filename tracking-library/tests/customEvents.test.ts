import { AnalyticsPulse } from '../src/core';
import * as utils from '../src/utils';

// Mock fetch globally
global.fetch = jest.fn();

// Mock Blob for size calculations
global.Blob = jest.fn((content: any[], options?: any) => {
  const str = content[0] || '';
  return {
    size: Buffer.byteLength(str, 'utf8'),
    type: options?.type || '',
  };
}) as any;

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('Custom Event Tracking (trackEvent & track)', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();

    // Mock successful fetch responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Mock Do Not Track as disabled
    jest.spyOn(utils, 'isDoNotTrackEnabled').mockReturnValue(false);
    jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/test');
    jest.spyOn(utils, 'getUserAgent').mockReturnValue('Mozilla/5.0 Test Browser');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Event Name Validation', () => {
    it('should accept valid event names (alphanumeric)', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false,
        debug: true
      });

      analytics.trackEvent('button_click');
      analytics.trackEvent('signup_completed');
      analytics.trackEvent('page-viewed');
      analytics.trackEvent('event123');
      analytics.trackEvent('UPPERCASE_EVENT');

      // Should send 5 events (all valid)
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('should reject event names with spaces', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        debug: true
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      analytics.trackEvent('button click');
      analytics.trackEvent('signup completed');

      expect(global.fetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AnalyticsPulse]'),
        expect.stringContaining('Invalid event name format'),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    it('should reject event names with special characters', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        debug: true
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      analytics.trackEvent('button@click');
      analytics.trackEvent('signup!completed');
      analytics.trackEvent('page#viewed');
      analytics.trackEvent('event$123');
      analytics.trackEvent('test%event');

      expect(global.fetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should reject empty event names', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        debug: true
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      analytics.trackEvent('');
      analytics.trackEvent(null as any);
      analytics.trackEvent(undefined as any);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should reject non-string event names', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        debug: true
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      analytics.trackEvent(123 as any);
      analytics.trackEvent({ name: 'test' } as any);
      analytics.trackEvent(['test'] as any);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Custom Data Validation', () => {
    it('should accept events without custom data', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      analytics.trackEvent('button_click');

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.name).toBe('button_click');
      expect(body.event.props).toBeUndefined();
    });

    it('should accept flat custom data objects', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      analytics.trackEvent('button_click', {
        button: 'signup',
        location: 'header',
        count: 1,
        enabled: true
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.props).toEqual({
        button: 'signup',
        location: 'header',
        count: 1,
        enabled: true
      });
    });

    it('should accept nested custom data objects', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      const nestedData = {
        user: {
          id: '123',
          name: 'John Doe',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        },
        metadata: {
          timestamp: 1234567890,
          version: '1.0.0'
        }
      };

      analytics.trackEvent('signup_completed', nestedData);

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.props).toEqual(nestedData);
    });

    it('should accept arrays in custom data', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      const dataWithArrays = {
        product_ids: ['123', '456', '789'],
        tags: ['electronics', 'sale'],
        categories: [
          { id: 1, name: 'Tech' },
          { id: 2, name: 'Gadgets' }
        ]
      };

      analytics.trackEvent('purchase', dataWithArrays);

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.props).toEqual(dataWithArrays);
    });

    it('should reject custom data exceeding 5KB', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        debug: true
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Create a large object (over 5KB)
      const largeData = {
        data: 'x'.repeat(6000) // 6KB string
      };

      analytics.trackEvent('large_event', largeData);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AnalyticsPulse]'),
        expect.stringContaining('exceeds maximum size'),
        expect.objectContaining({ eventName: 'large_event' })
      );

      consoleSpy.mockRestore();
    });

    it('should accept custom data exactly at 5KB limit', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      // Create data close to 5KB (accounting for JSON structure)
      const sizeLimit = 5120; // 5KB in bytes
      const dataString = 'x'.repeat(sizeLimit - 20); // Leave room for JSON overhead
      const data = { data: dataString };

      analytics.trackEvent('exact_limit_event', data);

      // Should succeed
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should accept custom data under 5KB limit', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      // Create data well under 5KB
      const data = {
        product_id: '123',
        price: 29.99,
        currency: 'USD',
        description: 'A nice product',
        tags: ['tag1', 'tag2', 'tag3']
      };

      analytics.trackEvent('purchase', data);

      // Should succeed
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle non-serializable custom data gracefully', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        debug: true
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Create circular reference
      const circularData: any = { a: 1 };
      circularData.self = circularData;

      analytics.trackEvent('circular_event', circularData);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AnalyticsPulse]'),
        expect.stringContaining('Failed to serialize'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Event Data Integration', () => {
    it('should include session ID in tracked events', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      const sessionId = analytics.getSessionId();

      analytics.trackEvent('test_event');

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.sessionId).toBe(sessionId);
      expect(body.sessionId).toBeTruthy();
    });

    it('should include visitor ID in tracked events', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      const visitorId = analytics.getVisitorId();

      analytics.trackEvent('test_event');

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.visitorId).toBe(visitorId);
      expect(body.visitorId).toBeTruthy();
    });

    it('should include current URL path automatically', () => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/checkout');

      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      analytics.trackEvent('checkout_started');

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.url).toBe('https://example.com/checkout');
    });

    it('should include timestamp automatically', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      const beforeTime = Date.now();
      analytics.trackEvent('test_event');
      const afterTime = Date.now();

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(body.event.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include user agent automatically', () => {
      const mockUserAgent = 'Mozilla/5.0 (Test Browser)';
      jest.spyOn(utils, 'getUserAgent').mockReturnValue(mockUserAgent);

      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      analytics.trackEvent('test_event');

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.userAgent).toBe(mockUserAgent);
    });
  });

  describe('Queue Integration', () => {
    it('should add event to queue when batching is enabled', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: true,
        batchSize: 10,
        flushInterval: 10000
      });

      analytics.trackEvent('test_event', { data: 'value' });

      // Should not send immediately (queued for batching)
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should send event immediately when batching is disabled', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      analytics.trackEvent('test_event', { data: 'value' });

      // Should send immediately
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Debug Logging', () => {
    it('should log event tracking when debug mode is enabled', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false,
        debug: true
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      analytics.trackEvent('test_event', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AnalyticsPulse]'),
        expect.stringContaining('Tracking custom event'),
        expect.objectContaining({
          eventName: 'test_event',
          data: { key: 'value' }
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log validation errors when debug mode is enabled', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        debug: true
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      analytics.trackEvent('invalid event name');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AnalyticsPulse]'),
        expect.stringContaining('Invalid event name format'),
        'invalid event name'
      );

      consoleSpy.mockRestore();
    });

    it('should not log when debug mode is disabled', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false,
        debug: false
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      analytics.trackEvent('test_event');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('track() Alias Method', () => {
    it('should work identically to trackEvent()', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      analytics.track('button_click', { button: 'signup' });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.name).toBe('button_click');
      expect(body.event.props).toEqual({ button: 'signup' });
    });

    it('should apply same validation rules as trackEvent()', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        debug: true
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      analytics.track('invalid event');

      expect(global.fetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Real-World Usage Examples', () => {
    it('should track simple button clicks', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      analytics.track('button_click');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should track signup events with plan data', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      analytics.track('signup_completed', {
        plan: 'premium',
        trial: false
      });

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.name).toBe('signup_completed');
      expect(body.event.props).toEqual({
        plan: 'premium',
        trial: false
      });
    });

    it('should track e-commerce purchases', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

      analytics.track('purchase', {
        product_id: '123',
        price: 29.99,
        currency: 'USD',
        category: 'electronics',
        quantity: 2
      });

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.name).toBe('purchase');
      expect(body.event.props).toMatchObject({
        product_id: '123',
        price: 29.99,
        currency: 'USD'
      });
    });

    it('should track complex nested data structures', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false
      });

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

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.name).toBe('form_submitted');
      expect(body.event.props.form_id).toBe('contact-form');
      expect(body.event.props.fields.name.valid).toBe(true);
    });
  });

  describe('Do Not Track Compliance', () => {
    it('should respect Do Not Track setting and not send events', () => {
      jest.spyOn(utils, 'isDoNotTrackEnabled').mockReturnValue(true);

      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        respectDoNotTrack: true
      });

      analytics.trackEvent('test_event', { data: 'value' });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
