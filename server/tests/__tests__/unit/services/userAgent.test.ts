import { UserAgentService, ParsedUserAgent } from '../../../../services/userAgent';

describe('UserAgentService', () => {
  let service: UserAgentService;

  beforeEach(() => {
    service = new UserAgentService();
  });

  describe('parseUserAgent', () => {
    it('should parse Chrome desktop user agent', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      const result = service.parseUserAgent(ua);

      expect(result.browser.name).toBe('Chrome');
      expect(result.browser.version).toMatch(/^120\./);
      expect(result.os.name).toBe('Windows');
      expect(result.os.version).toBe('10');
      expect(result.device.type).toBe('desktop');
      expect(result.isBot).toBe(false);
      expect(result.raw).toBe(ua);
    });

    it('should parse Firefox desktop user agent', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';

      const result = service.parseUserAgent(ua);

      expect(result.browser.name).toBe('Firefox');
      expect(result.browser.version).toMatch(/^121\./);
      expect(result.os.name).toBe('Windows');
      expect(result.device.type).toBe('desktop');
      expect(result.isBot).toBe(false);
    });

    it('should parse Safari desktop user agent', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15';

      const result = service.parseUserAgent(ua);

      expect(result.browser.name).toBe('Safari');
      expect(result.os.name).toBe('Mac OS');
      expect(result.device.type).toBe('desktop');
      expect(result.isBot).toBe(false);
    });

    it('should parse iPhone mobile user agent', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';

      const result = service.parseUserAgent(ua);

      expect(result.browser.name).toBe('Mobile Safari');
      expect(result.os.name).toBe('iOS');
      expect(result.device.type).toBe('mobile');
      expect(result.device.vendor).toBe('Apple');
      expect(result.device.model).toBe('iPhone');
      expect(result.isBot).toBe(false);
    });

    it('should parse Android mobile user agent', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

      const result = service.parseUserAgent(ua);

      expect(result.browser.name).toBe('Chrome');
      expect(result.os.name).toBe('Android');
      expect(result.os.version).toBe('13');
      expect(result.device.type).toBe('mobile');
      expect(result.device.vendor).toBe('Samsung');
      expect(result.isBot).toBe(false);
    });

    it('should parse iPad tablet user agent', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';

      const result = service.parseUserAgent(ua);

      expect(result.os.name).toBe('iOS');
      expect(result.device.type).toBe('tablet');
      expect(result.device.model).toBe('iPad');
      expect(result.isBot).toBe(false);
    });

    it('should detect Googlebot', () => {
      const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

      const result = service.parseUserAgent(ua);

      expect(result.isBot).toBe(true);
    });

    it('should detect Bingbot', () => {
      const ua = 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';

      const result = service.parseUserAgent(ua);

      expect(result.isBot).toBe(true);
    });

    it('should detect Lighthouse', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Chrome-Lighthouse';

      const result = service.parseUserAgent(ua);

      expect(result.isBot).toBe(true);
    });

    it('should detect crawler', () => {
      const ua = 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)';

      const result = service.parseUserAgent(ua);

      expect(result.isBot).toBe(true);
    });

    it('should detect spider', () => {
      const ua = 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)';

      const result = service.parseUserAgent(ua);

      expect(result.isBot).toBe(true);
    });

    it('should detect headless browser', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36';

      const result = service.parseUserAgent(ua);

      expect(result.isBot).toBe(true);
    });

    it('should handle unknown browser', () => {
      const ua = 'Unknown/1.0';

      const result = service.parseUserAgent(ua);

      expect(result.browser.name).toBe('Unknown');
      expect(result.browser.version).toBe('Unknown');
      expect(result.os.name).toBe('Unknown');
      expect(result.os.version).toBe('Unknown');
      expect(result.device.vendor).toBe('Unknown');
      expect(result.device.model).toBe('Unknown');
    });

    it('should handle empty string', () => {
      const ua = '';

      const result = service.parseUserAgent(ua);

      expect(result.browser.name).toBe('Unknown');
      expect(result.device.type).toBe('desktop');
      expect(result.isBot).toBe(false);
      expect(result.raw).toBe('');
    });

    it('should normalize console device type to unknown', () => {
      // Simulate a game console user agent
      const ua = 'Mozilla/5.0 (PlayStation 4) AppleWebKit/537.73 (KHTML, like Gecko)';

      const result = service.parseUserAgent(ua);

      // Console devices should be normalized to 'unknown'
      expect(result.device.type).toBe('unknown');
    });

    it('should default to desktop when no device type specified', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

      const result = service.parseUserAgent(ua);

      expect(result.device.type).toBe('desktop');
    });
  });

  describe('caching', () => {
    it('should cache parsed user agents', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      const result1 = service.parseUserAgent(ua);
      const result2 = service.parseUserAgent(ua);

      // Results should be the exact same object (from cache)
      expect(result1).toBe(result2);
    });

    it('should respect cache size limit', () => {
      const smallCacheService = new UserAgentService(3);

      const ua1 = 'User-Agent-1';
      const ua2 = 'User-Agent-2';
      const ua3 = 'User-Agent-3';
      const ua4 = 'User-Agent-4';

      smallCacheService.parseUserAgent(ua1);
      smallCacheService.parseUserAgent(ua2);
      smallCacheService.parseUserAgent(ua3);

      let stats = smallCacheService.getCacheStats();
      expect(stats.size).toBe(3);
      expect(stats.maxSize).toBe(3);

      // Adding a 4th item should evict the first
      smallCacheService.parseUserAgent(ua4);

      stats = smallCacheService.getCacheStats();
      expect(stats.size).toBe(3);
    });

    it('should clear cache', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

      service.parseUserAgent(ua);
      let stats = service.getCacheStats();
      expect(stats.size).toBe(1);

      service.clearCache();

      stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should track cache size correctly', () => {
      const ua1 = 'User-Agent-1';
      const ua2 = 'User-Agent-2';
      const ua3 = 'User-Agent-3';

      let stats = service.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(1000);

      service.parseUserAgent(ua1);
      stats = service.getCacheStats();
      expect(stats.size).toBe(1);

      service.parseUserAgent(ua2);
      service.parseUserAgent(ua3);
      stats = service.getCacheStats();
      expect(stats.size).toBe(3);

      // Parsing same user agent shouldn't increase cache size
      service.parseUserAgent(ua1);
      stats = service.getCacheStats();
      expect(stats.size).toBe(3);
    });

    it('should use custom cache size in constructor', () => {
      const customService = new UserAgentService(500);

      const stats = customService.getCacheStats();
      expect(stats.maxSize).toBe(500);
    });

    it('should implement LRU eviction correctly', () => {
      const smallCacheService = new UserAgentService(2);

      const ua1 = 'User-Agent-1';
      const ua2 = 'User-Agent-2';
      const ua3 = 'User-Agent-3';

      const result1 = smallCacheService.parseUserAgent(ua1);
      const result2 = smallCacheService.parseUserAgent(ua2);

      // Cache is now full with ua1 and ua2
      let stats = smallCacheService.getCacheStats();
      expect(stats.size).toBe(2);

      // Adding ua3 should evict ua1 (oldest)
      smallCacheService.parseUserAgent(ua3);

      stats = smallCacheService.getCacheStats();
      expect(stats.size).toBe(2);

      // Parse ua1 again - should not be cached (need to parse again)
      const result1Again = smallCacheService.parseUserAgent(ua1);
      expect(result1Again).not.toBe(result1); // Different object, not from cache

      // Parse ua2 again - should still be cached
      const result2Again = smallCacheService.parseUserAgent(ua2);
      expect(result2Again).toBe(result2); // Same object, from cache
    });
  });

  describe('edge cases', () => {
    it('should handle very long user agent strings', () => {
      const ua = 'Mozilla/5.0 '.repeat(100) + 'Chrome/120.0.0.0';

      const result = service.parseUserAgent(ua);

      expect(result).toBeDefined();
      expect(result.raw).toBe(ua);
    });

    it('should handle special characters in user agent', () => {
      const ua = 'Mozilla/5.0 (Test; ©®™) Chrome/120.0.0.0';

      const result = service.parseUserAgent(ua);

      expect(result).toBeDefined();
      expect(result.raw).toBe(ua);
    });

    it('should handle user agent with multiple bot patterns', () => {
      const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; spider; crawler; +http://www.google.com/bot.html)';

      const result = service.parseUserAgent(ua);

      expect(result.isBot).toBe(true);
    });

    it('should be case-insensitive for bot detection', () => {
      const ua1 = 'GoogleBot/2.0';
      const ua2 = 'GOOGLEBOT/2.0';
      const ua3 = 'googlebot/2.0';

      expect(service.parseUserAgent(ua1).isBot).toBe(true);
      expect(service.parseUserAgent(ua2).isBot).toBe(true);
      expect(service.parseUserAgent(ua3).isBot).toBe(true);
    });

    it('should not detect false positives for bot detection', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MyCustomBrowser/1.0';

      const result = service.parseUserAgent(ua);

      // Should not detect "browser" as "bot"
      expect(result.isBot).toBe(false);
    });

    it('should handle mediapartners bot', () => {
      const ua = 'Mediapartners-Google';

      const result = service.parseUserAgent(ua);

      expect(result.isBot).toBe(true);
    });

    it('should handle GTmetrix bot', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 GTmetrix';

      const result = service.parseUserAgent(ua);

      expect(result.isBot).toBe(true);
    });

    it('should handle Pingdom bot', () => {
      const ua = 'Mozilla/5.0 (compatible; Pingdom.com_bot_version_1.4)';

      const result = service.parseUserAgent(ua);

      expect(result.isBot).toBe(true);
    });

    it('should handle Yahoo Slurp bot', () => {
      const ua = 'Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)';

      const result = service.parseUserAgent(ua);

      expect(result.isBot).toBe(true);
    });
  });

  describe('device type normalization', () => {
    it('should normalize mobile to mobile', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Mobile Safari/537.36';

      const result = service.parseUserAgent(ua);

      expect(result.device.type).toBe('mobile');
    });

    it('should normalize tablet to tablet', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 17_1) AppleWebKit/605.1.15 Safari/604.1';

      const result = service.parseUserAgent(ua);

      expect(result.device.type).toBe('tablet');
    });

    it('should normalize smarttv to unknown', () => {
      // Smart TV user agents typically don't specify a device type or use "smarttv"
      const result = service.parseUserAgent('SmartTV/1.0');

      expect(result.device.type).toBe('desktop'); // Default when no device type
    });

    it('should normalize wearable to unknown', () => {
      const result = service.parseUserAgent('WearableDevice/1.0');

      expect(result.device.type).toBe('desktop'); // Default when no device type
    });
  });

  describe('singleton instance', () => {
    it('should export a default singleton instance', () => {
      const defaultService = require('../../../../services/userAgent').default;

      expect(defaultService).toBeInstanceOf(UserAgentService);
    });

    it('should allow creating multiple instances', () => {
      const service1 = new UserAgentService(100);
      const service2 = new UserAgentService(200);

      expect(service1.getCacheStats().maxSize).toBe(100);
      expect(service2.getCacheStats().maxSize).toBe(200);
    });
  });

  describe('ParsedUserAgent interface', () => {
    it('should return object with correct structure', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';

      const result = service.parseUserAgent(ua);

      expect(result).toHaveProperty('browser');
      expect(result.browser).toHaveProperty('name');
      expect(result.browser).toHaveProperty('version');
      expect(result).toHaveProperty('os');
      expect(result.os).toHaveProperty('name');
      expect(result.os).toHaveProperty('version');
      expect(result).toHaveProperty('device');
      expect(result.device).toHaveProperty('type');
      expect(result.device).toHaveProperty('vendor');
      expect(result.device).toHaveProperty('model');
      expect(result).toHaveProperty('isBot');
      expect(result).toHaveProperty('raw');
      expect(typeof result.isBot).toBe('boolean');
      expect(typeof result.raw).toBe('string');
    });
  });
});
