import rateLimit, { RateLimitRequestHandler, ipKeyGenerator } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import config from '../config/env';

/**
 * Helper to normalize IP addresses for rate limiting using express-rate-limit's
 * built-in ipKeyGenerator which properly handles IPv6 addresses
 */
function normalizeIp(ip: string | undefined): string {
  if (!ip) return 'unknown';
  return ipKeyGenerator(ip);
}

/**
 * Rate limiting configuration
 *
 * Provides tiered rate limiting for API endpoints to prevent abuse:
 * - API Key limits: Per project/API key rate limits
 * - IP limits: Per IP address rate limits
 * - Burst limits: Short-term spike protection
 */

// Parse rate limit configuration from environment
const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '3600000',
  10
); // 1 hour default
const RATE_LIMIT_MAX_REQUESTS = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || '10000',
  10
); // 10,000 per hour default
const RATE_LIMIT_IP_MAX = parseInt(
  process.env.RATE_LIMIT_IP_MAX || '1000',
  10
); // 1,000 per hour per IP
const RATE_LIMIT_BURST_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_BURST_WINDOW_MS || '60000',
  10
); // 1 minute default
const RATE_LIMIT_BURST_MAX = parseInt(
  process.env.RATE_LIMIT_BURST_MAX || '100',
  10
); // 100 per minute burst

/**
 * API Key-based rate limiter
 *
 * Limits requests per API key (project) to prevent single project abuse
 * Default: 10,000 requests per hour per API key
 */
export const apiKeyRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,

  // Use API key as identifier, fallback to IP (normalized for IPv6)
  keyGenerator: (req: Request) => {
    return req.apiKeyProjectId || req.apiKeyId || normalizeIp(req.ip);
  },

  // Custom error handler
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this API key. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
      limit: RATE_LIMIT_MAX_REQUESTS,
      window: `${RATE_LIMIT_WINDOW_MS / 1000 / 60} minutes`,
    });
  },

  // Skip rate limiting in test environment
  skip: (req: Request) => config.NODE_ENV === 'test',
});

/**
 * IP-based rate limiter
 *
 * Limits requests per IP address to prevent distributed abuse
 * Default: 1,000 requests per hour per IP
 */
export const ipRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_IP_MAX,
  standardHeaders: true,
  legacyHeaders: false,

  // Use IP address as identifier (normalized for IPv6)
  keyGenerator: (req: Request) => {
    // Get real IP considering proxy headers
    const xForwardedFor = req.headers['x-forwarded-for'];
    const xRealIp = req.headers['x-real-ip'];
    const cfConnectingIp = req.headers['cf-connecting-ip'];

    if (typeof cfConnectingIp === 'string') {
      return normalizeIp(cfConnectingIp);
    }

    if (typeof xRealIp === 'string') {
      return normalizeIp(xRealIp);
    }

    if (typeof xForwardedFor === 'string') {
      const ips = xForwardedFor.split(',');
      return normalizeIp(ips[0].trim());
    }

    return normalizeIp(req.ip);
  },

  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from your IP address. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
      limit: RATE_LIMIT_IP_MAX,
      window: `${RATE_LIMIT_WINDOW_MS / 1000 / 60} minutes`,
    });
  },

  skip: (req: Request) => config.NODE_ENV === 'test',
});

/**
 * Burst protection rate limiter
 *
 * Protects against sudden traffic spikes
 * Default: 100 requests per minute
 */
export const burstRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: RATE_LIMIT_BURST_WINDOW_MS,
  max: RATE_LIMIT_BURST_MAX,
  standardHeaders: true,
  legacyHeaders: false,

  // Use API key or normalized IP as identifier
  keyGenerator: (req: Request) => {
    return req.apiKeyProjectId || normalizeIp(req.ip);
  },

  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'BURST_LIMIT_EXCEEDED',
      message: 'Too many requests in a short time. Please slow down.',
      retryAfter: res.getHeader('Retry-After'),
      limit: RATE_LIMIT_BURST_MAX,
      window: `${RATE_LIMIT_BURST_WINDOW_MS / 1000} seconds`,
    });
  },

  skip: (req: Request) => config.NODE_ENV === 'test',
});

/**
 * Combined rate limiter middleware
 *
 * Applies all rate limiting strategies in sequence
 */
export function combinedRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Apply burst limiter first (fastest check)
  burstRateLimiter(req, res, (burstErr?: any) => {
    if (burstErr || res.headersSent) return;

    // Then apply IP limiter
    ipRateLimiter(req, res, (ipErr?: any) => {
      if (ipErr || res.headersSent) return;

      // Finally apply API key limiter
      apiKeyRateLimiter(req, res, (apiErr?: any) => {
        if (apiErr || res.headersSent) return;
        next();
      });
    });
  });
}

/**
 * Payload size validator middleware
 *
 * Limits request body size to prevent large payloads
 * Default: 10KB for tracking endpoints
 */
export function validatePayloadSize(maxSize: number = 10240) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];

    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      res.status(413).json({
        error: 'PAYLOAD_TOO_LARGE',
        message: `Request payload exceeds maximum size of ${maxSize} bytes`,
        maxSize,
      });
      return;
    }

    next();
  };
}

/**
 * Suspicious activity detector middleware
 *
 * Logs potential abuse patterns for monitoring
 */
interface SessionTracker {
  [sessionId: string]: Set<string>;
}

const sessionIpTracker: SessionTracker = {};
const TRACKER_CLEANUP_INTERVAL = 60 * 60 * 1000; // Clean up every hour

// Periodic cleanup of old session data
setInterval(() => {
  Object.keys(sessionIpTracker).forEach(sessionId => {
    delete sessionIpTracker[sessionId];
  });
}, TRACKER_CLEANUP_INTERVAL);

export function detectSuspiciousActivity(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const sessionId = req.body?.session_id;
  const ip = req.ip || 'unknown';

  if (sessionId) {
    // Track IPs for each session
    if (!sessionIpTracker[sessionId]) {
      sessionIpTracker[sessionId] = new Set();
    }

    sessionIpTracker[sessionId].add(ip);

    // Alert if same session ID from multiple IPs
    if (sessionIpTracker[sessionId].size > 3) {
      console.warn(
        `⚠️  Suspicious activity: Session ${sessionId} from ${sessionIpTracker[sessionId].size} different IPs`,
        Array.from(sessionIpTracker[sessionId])
      );

      // Optionally log to monitoring service here
    }
  }

  next();
}

/**
 * Honeypot field validator
 *
 * Rejects requests with honeypot fields that should be empty
 * Bots often fill all fields, including hidden ones
 */
export function validateHoneypot(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check for common honeypot field names
  const honeypotFields = ['website', 'url', 'homepage', 'phone'];

  for (const field of honeypotFields) {
    if (req.body && req.body[field]) {
      console.warn('⚠️  Honeypot field filled, rejecting request:', {
        field,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Return success to avoid revealing honeypot
      res.status(200).json({ ok: true });
      return;
    }
  }

  next();
}

/**
 * Export configuration for testing
 */
export const rateLimitConfig = {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_IP_MAX,
  RATE_LIMIT_BURST_WINDOW_MS,
  RATE_LIMIT_BURST_MAX,
};
