// eslint-disable-next-line @typescript-eslint/no-require-imports
const UAParser = require('ua-parser-js');

export interface ParsedUserAgent {
  browser: {
    name: string;
    version: string;
  };
  os: {
    name: string;
    version: string;
  };
  device: {
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    vendor: string;
    model: string;
  };
  isBot: boolean;
  raw: string;
}

export class UserAgentService {
  private cache: Map<string, ParsedUserAgent>;
  private readonly cacheMaxSize: number;

  constructor(cacheMaxSize: number = 1000) {
    this.cache = new Map();
    this.cacheMaxSize = cacheMaxSize;
  }

  /**
   * Parse a user agent string and extract browser, OS, and device information
   *
   * @param userAgentString - The user agent string from the HTTP request
   * @returns Parsed user agent information with normalized data
   */
  parseUserAgent(userAgentString: string): ParsedUserAgent {
    // Check cache first
    const cached = this.cache.get(userAgentString);
    if (cached) {
      return cached;
    }

    // Parse the user agent
    const parser = new UAParser(userAgentString);
    const result = parser.getResult();

    // Detect bots using common patterns
    const isBot = this.detectBot(userAgentString);

    // Normalize device type
    const deviceType = this.normalizeDeviceType(result.device.type);

    const parsed: ParsedUserAgent = {
      browser: {
        name: result.browser.name || 'Unknown',
        version: result.browser.version || 'Unknown',
      },
      os: {
        name: result.os.name || 'Unknown',
        version: result.os.version || 'Unknown',
      },
      device: {
        type: deviceType,
        vendor: result.device.vendor || 'Unknown',
        model: result.device.model || 'Unknown',
      },
      isBot,
      raw: userAgentString,
    };

    // Add to cache with LRU eviction
    this.addToCache(userAgentString, parsed);

    return parsed;
  }

  /**
   * Detect if the user agent is a bot/crawler
   */
  private detectBot(userAgentString: string): boolean {
    const botPatterns = [
      /bot/i,
      /crawl/i,
      /spider/i,
      /slurp/i,
      /mediapartners/i,
      /lighthouse/i,
      /gtmetrix/i,
      /pingdom/i,
      /headless/i,
    ];

    return botPatterns.some(pattern => pattern.test(userAgentString));
  }

  /**
   * Normalize device type to our standard categories
   */
  private normalizeDeviceType(
    uaDeviceType?: string
  ): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
    if (!uaDeviceType) {
      return 'desktop'; // Default to desktop if no device type specified
    }

    const type = uaDeviceType.toLowerCase();

    if (type === 'mobile') return 'mobile';
    if (type === 'tablet') return 'tablet';
    if (type === 'console' || type === 'smarttv' || type === 'wearable') {
      return 'unknown';
    }

    return 'desktop';
  }

  /**
   * Add parsed result to cache with LRU eviction
   */
  private addToCache(key: string, value: ParsedUserAgent): void {
    // If cache is full, remove the oldest entry (first in Map)
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.cacheMaxSize,
    };
  }
}

// Export singleton instance
export default new UserAgentService();
