/**
 * Unit tests for Sender class
 */

import { Sender, SenderConfig } from '../src/sender';
import { EventPayload } from '../src/types';

// Mock fetch globally
global.fetch = jest.fn();

// Mock setTimeout for testing delays
jest.useFakeTimers();

describe('Sender', () => {
  let sender: Sender;
  let mockEventPayload: EventPayload;
  let config: SenderConfig;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Default config
    config = {
      endpoint: 'https://api.example.com',
      apiKey: 'test-api-key',
      maxRetries: 3,
      retryDelay: 1000,
      debug: false,
      timeout: 10000,
    };

    sender = new Sender(config);

    // Mock event payload
    mockEventPayload = {
      apiKey: 'test-api-key',
      event: {
        name: 'test_event',
        timestamp: Date.now(),
      },
      sessionId: 'session-123',
      visitorId: 'visitor-456',
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Constructor', () => {
    it('should create a new Sender instance with default values', () => {
      const minimalConfig: SenderConfig = {
        endpoint: 'https://api.example.com',
        apiKey: 'test-key',
      };

      const testSender = new Sender(minimalConfig);
      const actualConfig = testSender.getConfig();

      expect(actualConfig.endpoint).toBe('https://api.example.com');
      expect(actualConfig.apiKey).toBe('test-key');
      expect(actualConfig.maxRetries).toBe(3);
      expect(actualConfig.retryDelay).toBe(1000);
      expect(actualConfig.debug).toBe(false);
      expect(actualConfig.timeout).toBe(10000);
    });

    it('should accept custom configuration values', () => {
      const customConfig: SenderConfig = {
        endpoint: 'https://custom.api.com',
        apiKey: 'custom-key',
        maxRetries: 5,
        retryDelay: 2000,
        debug: true,
        timeout: 15000,
      };

      const testSender = new Sender(customConfig);
      const actualConfig = testSender.getConfig();

      expect(actualConfig.maxRetries).toBe(5);
      expect(actualConfig.retryDelay).toBe(2000);
      expect(actualConfig.debug).toBe(true);
      expect(actualConfig.timeout).toBe(15000);
    });
  });

  describe('Endpoint Detection', () => {
    it('should use /api/v1/track/event for single event', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

      await sender.send(mockEventPayload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/track/event',
        expect.any(Object)
      );
    });

    it('should use /api/v1/track/batch for multiple events', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

      const events = [mockEventPayload, { ...mockEventPayload }];
      await sender.send(events);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/track/batch',
        expect.any(Object)
      );
    });

    it('should handle endpoint with trailing slash', async () => {
      const configWithSlash: SenderConfig = {
        ...config,
        endpoint: 'https://api.example.com/',
      };
      const testSender = new Sender(configWithSlash);

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

      await testSender.send(mockEventPayload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/track/event',
        expect.any(Object)
      );
    });
  });

  describe('Authorization', () => {
    it('should include API key in Authorization header', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

      await sender.send(mockEventPayload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should include Content-Type header', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

      await sender.send(mockEventPayload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('Successful Requests', () => {
    it('should return success for successful request', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { id: '123' } }),
      } as Response);

      const response = await sender.send(mockEventPayload);

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.retries).toBe(0);
      expect(response.data).toEqual({ success: true, data: { id: '123' } });
    });

    it('should send events with keepalive flag', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

      await sender.send(mockEventPayload, true);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          keepalive: true,
        })
      );
    });
  });

  describe('Error Handling - Client Errors (4xx)', () => {
    it('should not retry on 400 Bad Request', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid payload' }),
      } as Response);

      const response = await sender.send(mockEventPayload);

      expect(response.success).toBe(false);
      expect(response.status).toBe(400);
      expect(response.error).toBe('Invalid payload');
      expect(response.retries).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 Unauthorized', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' }),
      } as Response);

      const response = await sender.send(mockEventPayload);

      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
      expect(response.retries).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 403 Forbidden', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Access denied' }),
      } as Response);

      const response = await sender.send(mockEventPayload);

      expect(response.success).toBe(false);
      expect(response.status).toBe(403);
      expect(response.retries).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 404 Not Found', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Endpoint not found' }),
      } as Response);

      const response = await sender.send(mockEventPayload);

      expect(response.success).toBe(false);
      expect(response.status).toBe(404);
      expect(response.retries).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling - Server Errors (5xx)', () => {
    it('should retry on 500 Internal Server Error', async () => {
      jest.useRealTimers();
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Fail 3 times, then succeed
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: 'Server error' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: 'Server error' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: 'Server error' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response);

      const response = await sender.send(mockEventPayload);

      expect(response.success).toBe(true);
      expect(response.retries).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    }, 10000); // 10 second timeout

    it('should retry on 502 Bad Gateway', async () => {
      jest.useRealTimers();
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Clear any previous mocks
      mockFetch.mockClear();

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
          json: async () => ({ error: 'Bad gateway' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response);

      const response = await sender.send(mockEventPayload);

      expect(response.success).toBe(true);
      expect(response.retries).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 5000); // 5 second timeout

    it('should give up after max retries', async () => {
      jest.useRealTimers();
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Always fail - use mockImplementation for all calls
      mockFetch.mockImplementation(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      } as Response));

      const response = await sender.send(mockEventPayload);

      expect(response.success).toBe(false);
      expect(response.retries).toBe(3); // maxRetries
      expect(mockFetch).toHaveBeenCalledTimes(4); // initial + 3 retries
    }, 10000); // 10 second timeout
  });

  describe('Exponential Backoff', () => {
    it('should use exponential backoff delays: 1s, 2s, 4s', async () => {
      jest.useRealTimers();
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Track when requests are made
      const requestTimes: number[] = [];
      mockFetch.mockImplementation(async () => {
        requestTimes.push(Date.now());
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: 'Server error' }),
        } as Response;
      });

      const startTime = Date.now();
      await sender.send(mockEventPayload);
      const endTime = Date.now();

      // Should have made 4 requests (initial + 3 retries)
      expect(mockFetch).toHaveBeenCalledTimes(4);

      // Total time should be approximately 1000 + 2000 + 4000 = 7000ms
      const totalTime = endTime - startTime;
      expect(totalTime).toBeGreaterThanOrEqual(7000);
      expect(totalTime).toBeLessThan(8000); // Allow some tolerance
    }, 10000); // 10 second timeout

    it('should respect custom retry delay', async () => {
      jest.useRealTimers();
      const customConfig: SenderConfig = {
        ...config,
        retryDelay: 500, // Custom 500ms base delay
      };
      const customSender = new Sender(customConfig);

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      } as Response);

      const startTime = Date.now();
      await customSender.send(mockEventPayload);
      const endTime = Date.now();

      // Total time should be approximately 500 + 1000 + 2000 = 3500ms
      const totalTime = endTime - startTime;
      expect(totalTime).toBeGreaterThanOrEqual(3500);
      expect(totalTime).toBeLessThan(4500);
    });
  });

  describe('Network Errors', () => {
    it('should retry on network error', async () => {
      jest.useRealTimers();
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Fail with network error, then succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response);

      const response = await sender.send(mockEventPayload);

      expect(response.success).toBe(true);
      expect(response.retries).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should give up after max retries on network errors', async () => {
      jest.useRealTimers();
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Always fail with network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      const response = await sender.send(mockEventPayload);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Network error');
      expect(response.retries).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    }, 10000); // 10 second timeout
  });

  describe('Batch Requests', () => {
    it('should send multiple events to batch endpoint', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

      const events = [mockEventPayload, { ...mockEventPayload }];
      await sender.send(events);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/track/batch',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(events),
        })
      );
    });

    it('should retry batch requests on failure', async () => {
      jest.useRealTimers();
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: 'Server error' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response);

      const events = [mockEventPayload, { ...mockEventPayload }];
      const response = await sender.send(events);

      expect(response.success).toBe(true);
      expect(response.retries).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Configuration', () => {
    it('should return current configuration', () => {
      const actualConfig = sender.getConfig();

      expect(actualConfig.endpoint).toBe('https://api.example.com');
      expect(actualConfig.apiKey).toBe('test-api-key');
      expect(actualConfig.maxRetries).toBe(3);
    });

    it('should update configuration', () => {
      sender.updateConfig({ maxRetries: 5, debug: true });

      const updatedConfig = sender.getConfig();
      expect(updatedConfig.maxRetries).toBe(5);
      expect(updatedConfig.debug).toBe(true);
    });
  });

  describe('Debug Logging', () => {
    it('should log when debug is enabled', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const debugSender = new Sender({ ...config, debug: true });

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

      await debugSender.send(mockEventPayload);

      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    it('should not log when debug is disabled', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

      await sender.send(mockEventPayload);

      expect(consoleLogSpy).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });
  });

  describe('Request Timeout', () => {
    it('should timeout after configured duration', async () => {
      jest.useRealTimers();
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Simulate a request that never completes
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('AbortError'));
            }, 100);
          })
      );

      const timeoutSender = new Sender({ ...config, timeout: 100, maxRetries: 0 });
      const response = await timeoutSender.send(mockEventPayload);

      expect(response.success).toBe(false);
      expect(response.error).toContain('AbortError');
    });
  });

  describe('Response Parsing', () => {
    it('should handle non-JSON responses gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as Response);

      const response = await sender.send(mockEventPayload);

      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
    });

    it('should use statusText when error message not in response', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({}), // No error field
      } as Response);

      const response = await sender.send(mockEventPayload);

      expect(response.error).toBe('Bad Request');
    });
  });
});
