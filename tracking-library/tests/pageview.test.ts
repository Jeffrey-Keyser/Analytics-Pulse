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

describe('Pageview Tracking', () => {
  let originalPushState: typeof history.pushState;
  let originalReplaceState: typeof history.replaceState;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();

    // Save original history methods
    originalPushState = history.pushState;
    originalReplaceState = history.replaceState;

    // Mock successful fetch responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Mock Do Not Track as disabled
    jest.spyOn(utils, 'isDoNotTrackEnabled').mockReturnValue(false);

    // Mock document.title
    Object.defineProperty(document, 'title', {
      value: 'Test Page',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Restore original history methods
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
  });

  describe('Initial Page Load', () => {
    it('should track initial page load when autoTrack is enabled', () => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/');
      jest.spyOn(utils, 'getReferrer').mockReturnValue('https://google.com');

      new AnalyticsPulse('test-api-key', { autoTrack: true, enableBatching: false });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.name).toBe('page_view');
      expect(body.event.url).toBe('https://example.com/');
      expect(body.event.referrer).toBe('https://google.com');
    });

    it('should not track initial page load when autoTrack is disabled', () => {
      new AnalyticsPulse('test-api-key', { autoTrack: false, enableBatching: false });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should include document title in pageview event', () => {
      document.title = 'My Test Page';

      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false,
      });
      analytics.trackPageView();

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.props.title).toBe('My Test Page');
    });
  });

  describe('Manual Pageview Tracking', () => {
    it('should track pageview with metadata', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false,
      });

      analytics.trackPageView({
        title: 'Custom Title',
        category: 'landing',
        section: 'hero',
      });

      const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.event.props.title).toBe('Custom Title');
      expect(body.event.props.category).toBe('landing');
      expect(body.event.props.section).toBe('hero');
    });

    it('should track referrer correctly for subsequent pageviews', () => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page1');
      jest.spyOn(utils, 'getReferrer').mockReturnValue('https://google.com');

      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false,
      });

      // First pageview
      analytics.trackPageView();

      // Change URL and track second pageview
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page2');
      analytics.trackPageView();

      expect(global.fetch).toHaveBeenCalledTimes(2);

      // First pageview should use initial referrer
      const firstCall = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(firstCall.event.referrer).toBe('https://google.com');

      // Second pageview should use previous URL as referrer
      const secondCall = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
      expect(secondCall.event.referrer).toBe('https://example.com/page1');
    });

    it('should not track duplicate pageviews for same URL', () => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page1');

      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false,
      });

      // First pageview
      analytics.trackPageView();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second pageview with same URL
      analytics.trackPageView();
      // Should still be 1 call, not 2
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('SPA Navigation - History API', () => {
    it('should track pageview on history.pushState', (done) => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page1');

      void new AnalyticsPulse('test-api-key', {
        autoTrack: true,
        pageViewDebounceTime: 50,
        enableBatching: false,
      });

      // Clear initial pageview
      jest.clearAllMocks();

      // Change URL for next pageview
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page2');

      // Simulate pushState
      history.pushState({}, '', '/page2');

      // Wait for debounce
      setTimeout(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);

        const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(options.body);

        expect(body.event.name).toBe('page_view');
        expect(body.event.url).toBe('https://example.com/page2');
        done();
      }, 100);
    });

    it('should track pageview on history.replaceState', (done) => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page1');

      void new AnalyticsPulse('test-api-key', {
        autoTrack: true,
        pageViewDebounceTime: 50,
        enableBatching: false,
      });

      // Clear initial pageview
      jest.clearAllMocks();

      // Change URL for next pageview
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page3');

      // Simulate replaceState
      history.replaceState({}, '', '/page3');

      // Wait for debounce
      setTimeout(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);

        const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(options.body);

        expect(body.event.url).toBe('https://example.com/page3');
        done();
      }, 100);
    });

    it('should track pageview on popstate event', (done) => {
      const getPageUrlSpy = jest
        .spyOn(utils, 'getPageUrl')
        .mockReturnValue('https://example.com/page1');

      void new AnalyticsPulse('test-api-key', {
        autoTrack: true,
        pageViewDebounceTime: 50,
        enableBatching: false,
        debug: false,
      });

      // Clear initial pageview
      (global.fetch as jest.Mock).mockClear();

      // Change URL for next pageview
      getPageUrlSpy.mockReturnValue('https://example.com/page2');

      // Simulate popstate event (back/forward button)
      window.dispatchEvent(new PopStateEvent('popstate'));

      // Wait for debounce (longer wait to account for test isolation issues)
      setTimeout(() => {
        // Debug: log the calls
        const callCount = (global.fetch as jest.Mock).mock.calls.length;
        if (callCount !== 1) {
          console.log('Fetch call count:', callCount);
          console.log(
            'Calls:',
            (global.fetch as jest.Mock).mock.calls.map((call) => {
              const body = JSON.parse(call[1].body);
              return {
                url: body.event.url,
                name: body.event.name,
              };
            })
          );
        }
        expect(global.fetch).toHaveBeenCalledTimes(1);
        done();
      }, 200);
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid navigation events', (done) => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page1');

      void new AnalyticsPulse('test-api-key', {
        autoTrack: true,
        pageViewDebounceTime: 100,
        enableBatching: false,
      });

      // Clear initial pageview
      jest.clearAllMocks();

      // Simulate rapid navigation
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page2');
      history.pushState({}, '', '/page2');

      setTimeout(() => {
        jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page3');
        history.pushState({}, '', '/page3');
      }, 20);

      setTimeout(() => {
        jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page4');
        history.pushState({}, '', '/page4');
      }, 40);

      // Wait for debounce to settle
      setTimeout(() => {
        // Should only track the last pageview, not all three
        expect(global.fetch).toHaveBeenCalledTimes(1);

        const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(options.body);

        expect(body.event.url).toBe('https://example.com/page4');
        done();
      }, 250);
    });

    it('should use custom debounce time', (done) => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page1');

      void new AnalyticsPulse('test-api-key', {
        autoTrack: true,
        pageViewDebounceTime: 500,
        enableBatching: false,
      });

      // Clear initial pageview
      jest.clearAllMocks();

      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/page2');
      history.pushState({}, '', '/page2');

      // Should not have fired yet
      setTimeout(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      }, 300);

      // Should fire after full debounce time
      setTimeout(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        done();
      }, 600);
    });
  });

  describe('Path Exclusion', () => {
    it('should exclude paths matching regex pattern', () => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/admin/users');

      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        excludedPaths: [/^\/admin/],
        enableBatching: false,
      });

      analytics.trackPageView();

      // Should not send event
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should exclude paths matching string pattern', () => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/internal/test');

      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        excludedPaths: ['^/internal'],
        enableBatching: false,
      });

      analytics.trackPageView();

      // Should not send event
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should track paths that do not match exclusion patterns', () => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/public/page');

      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        excludedPaths: [/^\/admin/, /^\/internal/],
        enableBatching: false,
      });

      analytics.trackPageView();

      // Should send event
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple exclusion patterns', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        excludedPaths: [/^\/admin/, /^\/api/, '^/test'],
        enableBatching: false,
      });

      // Test excluded paths
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/admin/users');
      analytics.trackPageView();
      expect(global.fetch).not.toHaveBeenCalled();

      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/api/v1/data');
      analytics.trackPageView();
      expect(global.fetch).not.toHaveBeenCalled();

      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/test/page');
      analytics.trackPageView();
      expect(global.fetch).not.toHaveBeenCalled();

      // Test allowed path
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/public/page');
      analytics.trackPageView();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Hash-Based Routing', () => {
    it('should not track hash changes by default', (done) => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/#/page1');

      void new AnalyticsPulse('test-api-key', {
        autoTrack: true,
        trackHashChanges: false,
        pageViewDebounceTime: 50,
        enableBatching: false,
      });

      // Clear initial pageview
      jest.clearAllMocks();

      // Change hash
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/#/page2');
      window.dispatchEvent(new Event('hashchange'));

      // Wait for potential debounce
      setTimeout(() => {
        // Should not track hash change
        expect(global.fetch).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should track hash changes when enabled', (done) => {
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/#/page1');

      void new AnalyticsPulse('test-api-key', {
        autoTrack: true,
        trackHashChanges: true,
        pageViewDebounceTime: 50,
        enableBatching: false,
      });

      // Clear initial pageview
      jest.clearAllMocks();

      // Change hash
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('https://example.com/#/page2');
      window.dispatchEvent(new Event('hashchange'));

      // Wait for debounce
      setTimeout(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);

        const [_url, options] = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(options.body);

        expect(body.event.url).toBe('https://example.com/#/page2');
        done();
      }, 100);
    });
  });

  describe('Configuration', () => {
    it('should use default config values', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        enableBatching: false,
      });
      const config = analytics.getConfig();

      expect(config.excludedPaths).toEqual([]);
      expect(config.pageViewDebounceTime).toBe(300);
      expect(config.trackHashChanges).toBe(false);
    });

    it('should merge custom config with defaults', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        excludedPaths: [/^\/admin/],
        pageViewDebounceTime: 500,
        trackHashChanges: true,
        enableBatching: false,
      });

      const config = analytics.getConfig();

      expect(config.excludedPaths).toEqual([/^\/admin/]);
      expect(config.pageViewDebounceTime).toBe(500);
      expect(config.trackHashChanges).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle URL parsing errors gracefully', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: false,
        excludedPaths: [/^\/admin/],
        enableBatching: false,
      });

      // Mock getPageUrl to return invalid URL (this shouldn't normally happen)
      jest.spyOn(utils, 'getPageUrl').mockReturnValue('not-a-valid-url');

      // Should not throw error and should track by default
      expect(() => analytics.trackPageView()).not.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should not setup history interception twice', () => {
      const analytics = new AnalyticsPulse('test-api-key', {
        autoTrack: true,
        enableBatching: false,
      });

      const patchedPushState = history.pushState;

      // Call initialize again (shouldn't happen in practice, but test defensive code)
      (analytics as any).enableAutoPageViewTracking();

      // History methods should still be the same (not double-patched)
      expect(history.pushState).toBe(patchedPushState);
    });

    it('should work with Do Not Track enabled', () => {
      jest.spyOn(utils, 'isDoNotTrackEnabled').mockReturnValue(true);

      new AnalyticsPulse('test-api-key', { autoTrack: true, enableBatching: false });

      // Should not send any events
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
