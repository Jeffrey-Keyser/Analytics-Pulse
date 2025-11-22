import { EventQueue } from '../src/queue';
import { EventPayload } from '../src/types';

// Mock localStorage
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

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock navigator.onLine
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock navigator.sendBeacon
Object.defineProperty(global.navigator, 'sendBeacon', {
  writable: true,
  value: jest.fn(),
});

describe('EventQueue', () => {
  let mockSendFunction: jest.Mock;
  let queue: EventQueue;

  const createMockEvent = (name: string = 'test_event'): EventPayload => ({
    apiKey: 'test-key',
    event: {
      name,
      timestamp: Date.now(),
    },
    sessionId: 'session-123',
    visitorId: 'visitor-456',
  });

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();

    // Reset navigator.onLine
    (navigator as any).onLine = true;

    // Create mock send function
    mockSendFunction = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (queue) {
      queue.destroy();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      queue = new EventQueue({}, mockSendFunction);

      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });

    it('should initialize with custom config', () => {
      queue = new EventQueue(
        {
          batchSize: 20,
          flushInterval: 10000,
          maxQueueSize: 200,
          debug: true,
        },
        mockSendFunction
      );

      expect(queue).toBeDefined();
    });

    it('should restore queue from localStorage on init', () => {
      const events = [createMockEvent('event1'), createMockEvent('event2')];
      localStorageMock.setItem('analytics_pulse_queue', JSON.stringify(events));

      queue = new EventQueue({}, mockSendFunction);

      expect(queue.size()).toBe(2);
    });

    it('should limit restored queue to maxQueueSize', () => {
      const events = Array.from({ length: 150 }, (_, i) =>
        createMockEvent(`event${i}`)
      );
      localStorageMock.setItem('analytics_pulse_queue', JSON.stringify(events));

      queue = new EventQueue({ maxQueueSize: 100 }, mockSendFunction);

      expect(queue.size()).toBe(100);
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.setItem('analytics_pulse_queue', 'invalid json');

      queue = new EventQueue({}, mockSendFunction);

      expect(queue.size()).toBe(0);
      expect(localStorageMock.getItem('analytics_pulse_queue')).toBeNull();
    });
  });

  describe('Adding Events', () => {
    beforeEach(() => {
      queue = new EventQueue({ batchSize: 10 }, mockSendFunction);
    });

    it('should add event to queue', () => {
      const event = createMockEvent();
      queue.add(event);

      expect(queue.size()).toBe(1);
    });

    it('should persist queue to localStorage when adding event', () => {
      const event = createMockEvent();
      queue.add(event);

      const stored = localStorageMock.getItem('analytics_pulse_queue');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].event.name).toBe('test_event');
    });

    it('should remove oldest event when max queue size is reached', () => {
      queue = new EventQueue({ maxQueueSize: 3 }, mockSendFunction);

      queue.add(createMockEvent('event1'));
      queue.add(createMockEvent('event2'));
      queue.add(createMockEvent('event3'));
      queue.add(createMockEvent('event4'));

      expect(queue.size()).toBe(3);
    });

    it('should flush when batch size is reached', async () => {
      queue = new EventQueue({ batchSize: 3 }, mockSendFunction);

      queue.add(createMockEvent('event1'));
      queue.add(createMockEvent('event2'));
      queue.add(createMockEvent('event3'));

      // Wait for async flush to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSendFunction).toHaveBeenCalledTimes(1);
      expect(mockSendFunction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ event: expect.objectContaining({ name: 'event1' }) }),
          expect.objectContaining({ event: expect.objectContaining({ name: 'event2' }) }),
          expect.objectContaining({ event: expect.objectContaining({ name: 'event3' }) }),
        ])
      );
    });

    it('should not flush when offline', () => {
      (navigator as any).onLine = false;
      queue = new EventQueue({ batchSize: 2 }, mockSendFunction);

      queue.add(createMockEvent('event1'));
      queue.add(createMockEvent('event2'));

      expect(mockSendFunction).not.toHaveBeenCalled();
      expect(queue.size()).toBe(2);
    });
  });

  describe('Flushing', () => {
    beforeEach(() => {
      queue = new EventQueue({ batchSize: 10, flushInterval: 5000 }, mockSendFunction);
    });

    it('should manually flush queue', async () => {
      queue.add(createMockEvent('event1'));
      queue.add(createMockEvent('event2'));

      await queue.flush();

      expect(mockSendFunction).toHaveBeenCalledTimes(1);
      expect(queue.size()).toBe(0);
    });

    it('should not flush if queue is empty', async () => {
      await queue.flush();

      expect(mockSendFunction).not.toHaveBeenCalled();
    });

    it('should not flush if offline', async () => {
      // Set offline before creating queue
      (navigator as any).onLine = false;
      const offlineQueue = new EventQueue({ batchSize: 10, flushInterval: 5000 }, mockSendFunction);

      offlineQueue.add(createMockEvent('event1'));
      await offlineQueue.flush();

      expect(mockSendFunction).not.toHaveBeenCalled();
      expect(offlineQueue.size()).toBe(1);

      offlineQueue.destroy();
    });

    it('should clear queue after successful flush', async () => {
      queue.add(createMockEvent('event1'));
      queue.add(createMockEvent('event2'));

      await queue.flush();

      expect(queue.isEmpty()).toBe(true);

      const stored = localStorageMock.getItem('analytics_pulse_queue');
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(0);
    });

    it('should keep events in queue if flush fails', async () => {
      mockSendFunction.mockRejectedValue(new Error('Network error'));

      queue.add(createMockEvent('event1'));
      queue.add(createMockEvent('event2'));

      try {
        await queue.flush();
      } catch (error) {
        // Expected to fail
      }

      expect(queue.size()).toBe(2);
    });

    it(
      'should flush on timer interval',
      async () => {
        queue = new EventQueue({ flushInterval: 100 }, mockSendFunction); // Use short interval for test
        queue.add(createMockEvent('event1'));

        // Wait for timer to trigger
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(mockSendFunction).toHaveBeenCalledTimes(1);
      },
      10000
    ); // Increase test timeout

    it('should not prevent concurrent flushes', async () => {
      queue.add(createMockEvent('event1'));

      const flush1 = queue.flush();
      const flush2 = queue.flush(); // Should be ignored

      await Promise.all([flush1, flush2]);

      expect(mockSendFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Online/Offline Handling', () => {
    beforeEach(() => {
      queue = new EventQueue({ batchSize: 10 }, mockSendFunction);
    });

    it('should detect initial offline state', () => {
      (navigator as any).onLine = false;

      const offlineQueue = new EventQueue({}, mockSendFunction);
      offlineQueue.add(createMockEvent());

      expect(mockSendFunction).not.toHaveBeenCalled();

      offlineQueue.destroy();
    });

    it(
      'should flush queue when coming back online',
      async () => {
        (navigator as any).onLine = false;
        const offlineQueue = new EventQueue({ batchSize: 10 }, mockSendFunction);

        offlineQueue.add(createMockEvent('event1'));
        offlineQueue.add(createMockEvent('event2'));

        expect(mockSendFunction).not.toHaveBeenCalled();

        // Simulate coming back online
        (navigator as any).onLine = true;
        window.dispatchEvent(new Event('online'));

        // Wait for async flush
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockSendFunction).toHaveBeenCalledTimes(1);

        offlineQueue.destroy();
      },
      10000
    );

    it(
      'should handle offline event',
      async () => {
        (navigator as any).onLine = true;
        const onlineQueue = new EventQueue({ batchSize: 10 }, mockSendFunction);

        // Simulate going offline
        (navigator as any).onLine = false;
        window.dispatchEvent(new Event('offline'));

        // Wait a bit for event to be processed
        await new Promise((resolve) => setTimeout(resolve, 10));

        onlineQueue.add(createMockEvent());

        // Should not flush when offline
        expect(mockSendFunction).not.toHaveBeenCalled();

        onlineQueue.destroy();
      },
      10000
    );
  });

  describe('Page Unload', () => {
    beforeEach(() => {
      queue = new EventQueue({}, mockSendFunction);
    });

    it('should persist queue on beforeunload', () => {
      queue.add(createMockEvent('event1'));
      queue.add(createMockEvent('event2'));

      // Trigger beforeunload
      window.dispatchEvent(new Event('beforeunload'));

      const stored = localStorageMock.getItem('analytics_pulse_queue');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(2);
    });

    it('should handle beforeunload when offline', () => {
      (navigator as any).onLine = false;

      queue.add(createMockEvent('event1'));

      window.dispatchEvent(new Event('beforeunload'));

      const stored = localStorageMock.getItem('analytics_pulse_queue');
      expect(stored).toBeTruthy();
    });
  });

  describe('Queue Management', () => {
    beforeEach(() => {
      queue = new EventQueue({}, mockSendFunction);
    });

    it('should clear the queue', () => {
      queue.add(createMockEvent('event1'));
      queue.add(createMockEvent('event2'));

      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);

      const stored = localStorageMock.getItem('analytics_pulse_queue');
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(0);
    });

    it('should report correct queue size', () => {
      expect(queue.size()).toBe(0);

      queue.add(createMockEvent());
      expect(queue.size()).toBe(1);

      queue.add(createMockEvent());
      expect(queue.size()).toBe(2);
    });

    it('should report isEmpty correctly', () => {
      expect(queue.isEmpty()).toBe(true);

      queue.add(createMockEvent());
      expect(queue.isEmpty()).toBe(false);

      queue.clear();
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      queue = new EventQueue({ flushInterval: 5000 }, mockSendFunction);
    });

    it('should clean up resources on destroy', () => {
      queue.add(createMockEvent());

      queue.destroy();

      // Timer should be cleared, so advancing time shouldn't trigger flush
      jest.advanceTimersByTime(10000);

      expect(mockSendFunction).not.toHaveBeenCalled();
    });

    it('should remove event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      queue.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Debug Mode', () => {
    it('should log messages when debug is enabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      queue = new EventQueue({ debug: true }, mockSendFunction);
      queue.add(createMockEvent());

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some((call) => call[0] === '[EventQueue]')).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should not log messages when debug is disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      queue = new EventQueue({ debug: false }, mockSendFunction);
      queue.add(createMockEvent());

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Custom Storage Key', () => {
    it('should use custom storage key', () => {
      queue = new EventQueue({ storageKey: 'custom_queue' }, mockSendFunction);

      queue.add(createMockEvent());

      const stored = localStorageMock.getItem('custom_queue');
      expect(stored).toBeTruthy();

      const defaultStored = localStorageMock.getItem('analytics_pulse_queue');
      expect(defaultStored).toBeNull();
    });

    it('should restore from custom storage key', () => {
      const events = [createMockEvent()];
      localStorageMock.setItem('custom_queue', JSON.stringify(events));

      queue = new EventQueue({ storageKey: 'custom_queue' }, mockSendFunction);

      expect(queue.size()).toBe(1);
    });
  });
});
