import { SessionManager } from '../src/session';

// Mock timers
jest.useFakeTimers();

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
    _getStore: () => store,
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
    _getStore: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

describe('SessionManager', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorageMock.clear();
    sessionStorageMock.clear();

    // Reset document.hidden to false
    Object.defineProperty(document, 'hidden', {
      writable: true,
      configurable: true,
      value: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should generate and store visitor ID in localStorage', () => {
      const manager = new SessionManager();

      const visitorId = manager.getVisitorId();
      expect(visitorId).toBeTruthy();
      expect(visitorId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );

      // Verify it's stored in localStorage
      expect(localStorageMock.getItem('_ap_visitor_id')).toBe(visitorId);
    });

    it('should reuse existing visitor ID from localStorage', () => {
      const existingId = '12345678-1234-4123-8123-123456789012';
      localStorageMock.setItem('_ap_visitor_id', existingId);

      const manager = new SessionManager();

      expect(manager.getVisitorId()).toBe(existingId);
    });

    it('should generate and store session ID in sessionStorage', () => {
      const manager = new SessionManager();

      const sessionId = manager.getSessionId();
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );

      // Verify it's stored in sessionStorage
      expect(sessionStorageMock.getItem('_ap_session_id')).toBe(sessionId);
    });

    it('should reuse existing session ID if not expired', () => {
      const existingId = '87654321-4321-4321-8321-210987654321';
      sessionStorageMock.setItem('_ap_session_id', existingId);
      sessionStorageMock.setItem('_ap_session_start', Date.now().toString());
      sessionStorageMock.setItem('_ap_last_activity', Date.now().toString());

      const manager = new SessionManager();

      expect(manager.getSessionId()).toBe(existingId);
      expect(manager.getIsNewSession()).toBe(false);
    });

    it('should create new session if existing session is expired', () => {
      const existingId = '87654321-4321-4321-8321-210987654321';
      const expiredTime = Date.now() - 31 * 60 * 1000; // 31 minutes ago

      sessionStorageMock.setItem('_ap_session_id', existingId);
      sessionStorageMock.setItem('_ap_session_start', expiredTime.toString());
      sessionStorageMock.setItem('_ap_last_activity', expiredTime.toString());

      const manager = new SessionManager();

      expect(manager.getSessionId()).not.toBe(existingId);
      expect(manager.getIsNewSession()).toBe(true);
    });

    it('should set default session timeout to 30 minutes', () => {
      const manager = new SessionManager();

      expect(manager.getSessionTimeout()).toBe(30 * 60 * 1000);
    });

    it('should allow custom session timeout', () => {
      const customTimeout = 10 * 60 * 1000; // 10 minutes
      const manager = new SessionManager({ sessionTimeout: customTimeout });

      expect(manager.getSessionTimeout()).toBe(customTimeout);
    });

    it('should mark session as new on first creation', () => {
      const manager = new SessionManager();

      expect(manager.getIsNewSession()).toBe(true);
    });

    it('should return false for isNewSession on subsequent calls', () => {
      const manager = new SessionManager();

      expect(manager.getIsNewSession()).toBe(true);
      expect(manager.getIsNewSession()).toBe(false);
      expect(manager.getIsNewSession()).toBe(false);
    });
  });

  describe('Session Start Time', () => {
    it('should track session start time', () => {
      const beforeTime = Date.now();
      const manager = new SessionManager();
      const afterTime = Date.now();

      const startTime = manager.getSessionStartTime();
      expect(startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(startTime).toBeLessThanOrEqual(afterTime);
    });

    it('should preserve session start time for existing session', () => {
      const existingStartTime = Date.now() - 5 * 60 * 1000; // 5 minutes ago
      sessionStorageMock.setItem('_ap_session_id', 'existing-session');
      sessionStorageMock.setItem('_ap_session_start', existingStartTime.toString());
      sessionStorageMock.setItem('_ap_last_activity', Date.now().toString());

      const manager = new SessionManager();

      expect(manager.getSessionStartTime()).toBe(existingStartTime);
    });
  });

  describe('Session Timeout', () => {
    it('should create new session after timeout', () => {
      const manager = new SessionManager({ sessionTimeout: 1000 }); // 1 second
      const originalSessionId = manager.getSessionId();

      // Advance time past timeout
      jest.advanceTimersByTime(1001);

      const newSessionId = manager.getSessionId();
      expect(newSessionId).not.toBe(originalSessionId);
    });

    it('should reset timeout on activity', () => {
      const manager = new SessionManager({ sessionTimeout: 1000 });
      const originalSessionId = manager.getSessionId();

      // Advance time but not past timeout
      jest.advanceTimersByTime(500);

      // Simulate activity (mousedown)
      window.dispatchEvent(new MouseEvent('mousedown'));

      // Advance time again, but session should not timeout
      jest.advanceTimersByTime(700);

      expect(manager.getSessionId()).toBe(originalSessionId);
    });

    it('should update last activity time on user interaction', () => {
      const manager = new SessionManager();
      const initialActivity = manager.getLastActivityTime();

      // Advance time
      jest.advanceTimersByTime(1000);

      // Simulate activity
      window.dispatchEvent(new KeyboardEvent('keydown'));

      const updatedActivity = manager.getLastActivityTime();
      expect(updatedActivity).toBeGreaterThan(initialActivity);
    });
  });

  describe('Page Visibility API', () => {
    it('should pause timeout when page is hidden', () => {
      const manager = new SessionManager({ sessionTimeout: 2000 });
      const originalSessionId = manager.getSessionId();

      // Advance time
      jest.advanceTimersByTime(500);

      // Hide page
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Advance time while hidden (should not timeout)
      jest.advanceTimersByTime(3000);

      expect(manager.getSessionId()).toBe(originalSessionId);
    });

    it('should resume timeout when page becomes visible', () => {
      const manager = new SessionManager({ sessionTimeout: 2000 });
      const originalSessionId = manager.getSessionId();

      // Advance time
      jest.advanceTimersByTime(500);

      // Hide page
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Advance time while hidden
      jest.advanceTimersByTime(1000);

      // Show page
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Session should still be valid
      expect(manager.getSessionId()).toBe(originalSessionId);

      // Advance time past timeout
      jest.advanceTimersByTime(2001);

      // Now session should timeout
      expect(manager.getSessionId()).not.toBe(originalSessionId);
    });

    it('should create new session if expired while hidden', () => {
      const manager = new SessionManager({ sessionTimeout: 1000 });
      const originalSessionId = manager.getSessionId();

      // Hide page immediately
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Advance time past timeout while hidden
      jest.advanceTimersByTime(2000);

      // Show page - should detect expired session
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(manager.getSessionId()).not.toBe(originalSessionId);
    });
  });

  describe('Activity Tracking', () => {
    it('should track mousedown events', () => {
      const manager = new SessionManager({ sessionTimeout: 1000 });
      const originalSessionId = manager.getSessionId();

      // Advance time close to timeout
      jest.advanceTimersByTime(900);

      // Trigger mousedown
      window.dispatchEvent(new MouseEvent('mousedown'));

      // Advance more time (should not timeout due to activity reset)
      jest.advanceTimersByTime(500);

      expect(manager.getSessionId()).toBe(originalSessionId);
    });

    it('should track keydown events', () => {
      const manager = new SessionManager({ sessionTimeout: 1000 });
      const originalSessionId = manager.getSessionId();

      jest.advanceTimersByTime(900);
      window.dispatchEvent(new KeyboardEvent('keydown'));
      jest.advanceTimersByTime(500);

      expect(manager.getSessionId()).toBe(originalSessionId);
    });

    it('should track scroll events', () => {
      const manager = new SessionManager({ sessionTimeout: 1000 });
      const originalSessionId = manager.getSessionId();

      jest.advanceTimersByTime(900);
      window.dispatchEvent(new Event('scroll'));
      jest.advanceTimersByTime(500);

      expect(manager.getSessionId()).toBe(originalSessionId);
    });

    it('should track touchstart events', () => {
      const manager = new SessionManager({ sessionTimeout: 1000 });
      const originalSessionId = manager.getSessionId();

      jest.advanceTimersByTime(900);
      window.dispatchEvent(new TouchEvent('touchstart'));
      jest.advanceTimersByTime(500);

      expect(manager.getSessionId()).toBe(originalSessionId);
    });
  });

  describe('Manual Session Control', () => {
    it('should allow manually ending session', () => {
      const manager = new SessionManager();
      const originalSessionId = manager.getSessionId();

      manager.endSession();

      const newSessionId = manager.getSessionId();
      expect(newSessionId).not.toBe(originalSessionId);
      expect(manager.getIsNewSession()).toBe(true);
    });

    it('should update session storage when manually ending session', () => {
      const manager = new SessionManager();
      const originalSessionId = manager.getSessionId();

      manager.endSession();

      const storedSessionId = sessionStorageMock.getItem('_ap_session_id');
      expect(storedSessionId).not.toBe(originalSessionId);
      expect(storedSessionId).toBe(manager.getSessionId());
    });
  });

  describe('Storage Failures', () => {
    it('should handle localStorage unavailable', () => {
      // Mock localStorage to throw errors
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: () => {
            throw new Error('localStorage unavailable');
          },
          setItem: () => {
            throw new Error('localStorage unavailable');
          },
        },
        writable: true,
        configurable: true,
      });

      const manager = new SessionManager();

      // Should still generate a visitor ID (temporary)
      expect(manager.getVisitorId()).toBeTruthy();

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      });
    });

    it('should handle sessionStorage unavailable', () => {
      // Mock sessionStorage to throw errors
      const originalSessionStorage = window.sessionStorage;
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          getItem: () => {
            throw new Error('sessionStorage unavailable');
          },
          setItem: () => {
            throw new Error('sessionStorage unavailable');
          },
        },
        writable: true,
        configurable: true,
      });

      const manager = new SessionManager();

      // Should still generate a session ID (temporary)
      expect(manager.getSessionId()).toBeTruthy();

      // Restore sessionStorage
      Object.defineProperty(window, 'sessionStorage', {
        value: originalSessionStorage,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('Cleanup', () => {
    it('should clean up timeout timer on destroy', () => {
      const manager = new SessionManager({ sessionTimeout: 1000 });
      const originalSessionId = manager.getSessionId();

      // Destroy the manager
      manager.destroy();

      // Advance time past timeout
      jest.advanceTimersByTime(2000);

      // Session should not have changed (timer was cleared)
      expect(manager.getSessionId()).toBe(originalSessionId);
    });
  });

  describe('Debug Mode', () => {
    it('should log messages when debug is enabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      new SessionManager({ debug: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SessionManager]',
        expect.stringContaining('initialized'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should not log messages when debug is disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      new SessionManager({ debug: false });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid pause/resume cycles', () => {
      const manager = new SessionManager({ sessionTimeout: 2000 });
      const originalSessionId = manager.getSessionId();

      // Hide
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Show
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Hide again
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Show again
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Session should still be valid
      expect(manager.getSessionId()).toBe(originalSessionId);
    });

    it('should handle multiple activity events in quick succession', () => {
      const manager = new SessionManager({ sessionTimeout: 1000 });
      const originalSessionId = manager.getSessionId();

      // Simulate multiple rapid events
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new MouseEvent('mousedown'));
      }

      jest.advanceTimersByTime(500);

      // Session should still be valid
      expect(manager.getSessionId()).toBe(originalSessionId);
    });

    it('should handle session timeout at exact boundary', () => {
      const manager = new SessionManager({ sessionTimeout: 1000 });
      const originalSessionId = manager.getSessionId();

      // Advance to exactly the timeout
      jest.advanceTimersByTime(1000);

      // Should have timed out
      expect(manager.getSessionId()).not.toBe(originalSessionId);
    });
  });
});
