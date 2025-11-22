import { AnalyticsPulse } from '../src/core';
import * as utils from '../src/utils';

// Mock fetch globally
global.fetch = jest.fn();

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

describe('AnalyticsPulse', () => {
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should throw error if API key is not provided', () => {
      expect(() => new AnalyticsPulse('')).toThrow('API key is required');
    });

    it('should throw error if API key is not a string', () => {
      expect(() => new AnalyticsPulse(123 as any)).toThrow('API key is required');
    });

    it('should initialize with API key and default config', () => {
      const analytics = new AnalyticsPulse('test-api-key');
      const config = analytics.getConfig();

      expect(config).toMatchObject({
        debug: false,
        autoTrack: true,
        trackOutboundLinks: false,
        respectDoNotTrack: true,
        maxRetries: 3,
        retryDelay: 1000,
      });
    });

    it('should merge custom config with defaults', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        debug: true,
        autoTrack: false,
        maxRetries: 5,
      });

      const config = analytics.getConfig();

      expect(config.debug).toBe(true);
      expect(config.autoTrack).toBe(false);
      expect(config.maxRetries).toBe(5);
      expect(config.respectDoNotTrack).toBe(true); // Should keep default
    });

    it('should not initialize if Do Not Track is enabled', () => {
      jest.spyOn(utils, 'isDoNotTrackEnabled').mockReturnValue(true);

      new AnalyticsPulse('test-api-key', { autoTrack: true });

      // Should not send any requests
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should track page view on initialization if autoTrack is enabled', () => {
      new AnalyticsPulse('test-api-key', { autoTrack: true, enableBatching: false });

      // Should send one page view event
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should not track page view on initialization if autoTrack is disabled', () => {
      new AnalyticsPulse('test-api-key', { autoTrack: false });

      // Should not send any requests
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('trackPageView', () => {
    it('should send page view event with correct data', () => {
      // Mock utils before creating instance (referrer is captured at initialization)
      jest.spyOn(utils, 'getReferrer').mockReturnValue('https://google.com');
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page');
      jest.spyOn(utils, 'getScreenDimensions').mockReturnValue({
        width: 1920,
        height: 1080,
      });

      const analytics = new AnalyticsPulse('test-api-key', { autoTrack: false, enableBatching: false });

      analytics.trackPageView();

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.name).toBe('page_view');
      expect(body.event.url).toBe('https://example.com/page');
      expect(body.event.referrer).toBe('https://google.com');
      expect(body.event.screenWidth).toBe(1920);
      expect(body.event.screenHeight).toBe(1080);
    });

    it('should include custom properties in page view event', () => {
      const analytics = new AnalyticsPulse('test-api-key', { autoTrack: false, enableBatching: false });

      analytics.trackPageView({ category: 'landing', version: 2 });

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.props).toMatchObject({ category: 'landing', version: 2 });
    });
  });

  describe('trackEvent', () => {
    it('should send custom event with correct data', () => {
      const analytics = new AnalyticsPulse('test-api-key', { autoTrack: false, enableBatching: false });

      analytics.trackEvent('button_click', { button: 'signup', location: 'header' });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.name).toBe('button_click');
      expect(body.event.props).toEqual({ button: 'signup', location: 'header' });
    });

    it('should not send event if event name is invalid', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        debug: true,
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      analytics.trackEvent('', { test: 'value' });
      analytics.trackEvent(null as any, { test: 'value' });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should include custom props from config in every event', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false,
        customProps: { app_version: '1.0.0', environment: 'production' },
      });

      analytics.trackEvent('button_click', { button: 'signup' });

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.props).toEqual({
        app_version: '1.0.0',
        environment: 'production',
        button: 'signup',
      });
    });
  });

  describe('setDebug', () => {
    it('should enable debug mode', () => {
      const analytics = new AnalyticsPulse('test-api-key', { autoTrack: false });

      analytics.setDebug(true);

      expect(analytics.getConfig().debug).toBe(true);
    });

    it('should disable debug mode', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        debug: true,
      });

      analytics.setDebug(false);

      expect(analytics.getConfig().debug).toBe(false);
    });
  });

  describe('Visitor and Session IDs', () => {
    it('should generate and store visitor ID in localStorage', () => {
      new AnalyticsPulse('test-api-key', { autoTrack: false });

      const visitorId = localStorageMock.getItem('_ap_visitor_id');
      expect(visitorId).toBeTruthy();
      expect(visitorId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should reuse existing visitor ID from localStorage', () => {
      const existingId = '12345678-1234-4123-8123-123456789012';
      localStorageMock.setItem('_ap_visitor_id', existingId);

      new AnalyticsPulse('test-api-key', { autoTrack: false });

      expect(localStorageMock.getItem('_ap_visitor_id')).toBe(existingId);
    });

    it('should generate and store session ID in sessionStorage', () => {
      new AnalyticsPulse('test-api-key', { autoTrack: false });

      const sessionId = sessionStorageMock.getItem('_ap_session_id');
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('API Communication', () => {
    it('should send events to the configured endpoint', () => {
      const customEndpoint = 'https://custom.example.com/track';
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false,
        endpoint: customEndpoint,
      });

      analytics.trackEvent('test_event');

      expect(global.fetch).toHaveBeenCalledWith(
        customEndpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should include API key in request payload', () => {
      const analytics = new AnalyticsPulse('my-secret-key', { autoTrack: false, enableBatching: false });

      analytics.trackEvent('test_event');

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.apiKey).toBe('my-secret-key');
    });

    it('should include visitor and session IDs in request payload', () => {
      const analytics = new AnalyticsPulse('test-api-key', { autoTrack: false, enableBatching: false });

      analytics.trackEvent('test_event');

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.visitorId).toBeTruthy();
      expect(body.sessionId).toBeTruthy();
    });
  });
});
