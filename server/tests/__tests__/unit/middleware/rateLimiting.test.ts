import { Request, Response, NextFunction } from 'express';
import {
  validatePayloadSize,
  detectSuspiciousActivity,
  validateHoneypot,
  rateLimitConfig,
} from '../../../../middleware/rateLimiting';

describe('Rate Limiting Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      body: {},
      ip: '127.0.0.1',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    };

    nextFunction = jest.fn();
  });

  describe('validatePayloadSize', () => {
    it('should allow requests within size limit', () => {
      mockRequest.headers = { 'content-length': '5000' };

      const middleware = validatePayloadSize(10240);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject requests exceeding size limit', () => {
      mockRequest.headers = { 'content-length': '15000' };

      const middleware = validatePayloadSize(10240);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(413);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds maximum size of 10240 bytes',
        maxSize: 10240,
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow requests without content-length header', () => {
      mockRequest.headers = {};

      const middleware = validatePayloadSize(10240);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should use custom max size', () => {
      mockRequest.headers = { 'content-length': '50000' };

      const middleware = validatePayloadSize(100000);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('should track session IPs and allow normal activity', () => {
      mockRequest.body = { session_id: 'test-session-1' };
      mockRequest.ip = '192.168.1.1';

      detectSuspiciousActivity(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow requests without session_id', () => {
      mockRequest.body = {};

      detectSuspiciousActivity(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should track multiple IPs for same session', () => {
      const sessionId = 'test-session-multi-ip';
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // First IP
      mockRequest.body = { session_id: sessionId };
      mockRequest.ip = '192.168.1.1';
      detectSuspiciousActivity(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Second IP
      mockRequest.ip = '192.168.1.2';
      detectSuspiciousActivity(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Third IP
      mockRequest.ip = '192.168.1.3';
      detectSuspiciousActivity(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Fourth IP - should trigger warning
      mockRequest.ip = '192.168.1.4';
      detectSuspiciousActivity(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suspicious activity'),
        expect.any(Array)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('validateHoneypot', () => {
    it('should allow requests without honeypot fields', () => {
      mockRequest.body = {
        session_id: 'test-session',
        event_type: 'pageview',
      };

      validateHoneypot(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject requests with filled honeypot "website" field', () => {
      mockRequest.body = {
        session_id: 'test-session',
        website: 'http://spam.com',
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      validateHoneypot(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true });
      expect(nextFunction).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Honeypot field filled'),
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should reject requests with filled honeypot "url" field', () => {
      mockRequest.body = {
        session_id: 'test-session',
        url: 'http://spam.com',
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      validateHoneypot(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(nextFunction).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should reject requests with filled honeypot "phone" field', () => {
      mockRequest.body = {
        session_id: 'test-session',
        phone: '555-1234',
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      validateHoneypot(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(nextFunction).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('rateLimitConfig', () => {
    it('should have valid configuration', () => {
      expect(rateLimitConfig.RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
      expect(rateLimitConfig.RATE_LIMIT_MAX_REQUESTS).toBeGreaterThan(0);
      expect(rateLimitConfig.RATE_LIMIT_IP_MAX).toBeGreaterThan(0);
      expect(rateLimitConfig.RATE_LIMIT_BURST_WINDOW_MS).toBeGreaterThan(0);
      expect(rateLimitConfig.RATE_LIMIT_BURST_MAX).toBeGreaterThan(0);
    });

    it('should have reasonable default values', () => {
      // Check that defaults make sense (10k/hour, 1k/hour per IP, 100/min burst)
      expect(rateLimitConfig.RATE_LIMIT_MAX_REQUESTS).toBeGreaterThanOrEqual(1000);
      expect(rateLimitConfig.RATE_LIMIT_IP_MAX).toBeGreaterThanOrEqual(100);
      expect(rateLimitConfig.RATE_LIMIT_BURST_MAX).toBeGreaterThanOrEqual(10);
    });
  });
});
