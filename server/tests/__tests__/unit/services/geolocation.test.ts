import { GeolocationService, GeolocationResult } from '../../../../services/geolocation';
import crypto from 'crypto';

// Mock geoip-lite
jest.mock('geoip-lite', () => ({
  lookup: jest.fn(),
}));

// Mock config
jest.mock('../../../../config/env', () => ({
  default: {
    IP_HASH_SALT: 'test-salt-for-hashing',
  },
}));

import geoip from 'geoip-lite';

describe('GeolocationService', () => {
  let service: GeolocationService;
  let mockLookup: jest.MockedFunction<typeof geoip.lookup>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLookup = geoip.lookup as jest.MockedFunction<typeof geoip.lookup>;
    service = new GeolocationService('test-salt');
  });

  describe('lookupCountry', () => {
    it('should return country code and hashed IP for valid US IP', () => {
      const ip = '8.8.8.8'; // Google DNS (US)
      mockLookup.mockReturnValue({
        country: 'US',
        region: 'CA',
        timezone: 'America/Los_Angeles',
        ll: [37.751, -97.822],
        range: [134744064, 134744319],
        eu: '0',
        metro: 0,
        area: 1000,
      });

      const result = service.lookupCountry(ip);

      expect(result.country).toBe('US');
      expect(result.ipHash).toBeDefined();
      expect(result.ipHash).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(mockLookup).toHaveBeenCalledWith(ip);
    });

    it('should return country code and hashed IP for valid UK IP', () => {
      const ip = '81.2.69.142'; // BBC UK
      mockLookup.mockReturnValue({
        country: 'GB',
        region: 'ENG',
        timezone: 'Europe/London',
        ll: [51.5074, -0.1278],
        range: [1359020032, 1359085567],
        eu: '1',
        metro: 0,
        area: 1000,
      });

      const result = service.lookupCountry(ip);

      expect(result.country).toBe('GB');
      expect(result.ipHash).toBeDefined();
    });

    it('should return XX for invalid IP address', () => {
      const ip = 'invalid-ip';

      const result = service.lookupCountry(ip);

      expect(result.country).toBe('XX');
      expect(result.ipHash).toBeUndefined();
      expect(mockLookup).not.toHaveBeenCalled();
    });

    it('should return XX when geoip lookup returns null', () => {
      const ip = '127.0.0.1'; // Localhost
      mockLookup.mockReturnValue(null);

      const result = service.lookupCountry(ip);

      expect(result.country).toBe('XX');
      expect(result.ipHash).toBeDefined();
      expect(mockLookup).toHaveBeenCalledWith(ip);
    });

    it('should handle IPv6 addresses', () => {
      const ip = '2001:4860:4860::8888'; // Google DNS IPv6
      mockLookup.mockReturnValue({
        country: 'US',
        region: '',
        timezone: 'America/Chicago',
        ll: [37.751, -97.822],
        range: [0, 0],
        eu: '0',
        metro: 0,
        area: 1000,
      });

      const result = service.lookupCountry(ip);

      expect(result.country).toBe('US');
      expect(result.ipHash).toBeDefined();
    });

    it('should return XX for IP out of range', () => {
      const ip = '256.256.256.256'; // Invalid IP (octets > 255)

      const result = service.lookupCountry(ip);

      expect(result.country).toBe('XX');
      expect(result.ipHash).toBeUndefined();
    });

    it('should handle empty string IP', () => {
      const ip = '';

      const result = service.lookupCountry(ip);

      expect(result.country).toBe('XX');
      expect(result.ipHash).toBeUndefined();
    });
  });

  describe('hashIp', () => {
    it('should hash IP address consistently', () => {
      const ip = '192.168.1.1';

      const hash1 = service.hashIp(ip);
      const hash2 = service.hashIp(ip);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should produce different hashes for different IPs', () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      const hash1 = service.hashIp(ip1);
      const hash2 = service.hashIp(ip2);

      expect(hash1).not.toBe(hash2);
    });

    it('should include salt in hash', () => {
      const ip = '192.168.1.1';
      const serviceWithSalt = new GeolocationService('my-salt');
      const serviceWithoutSalt = new GeolocationService('');

      const hashWithSalt = serviceWithSalt.hashIp(ip);
      const hashWithoutSalt = serviceWithoutSalt.hashIp(ip);

      expect(hashWithSalt).not.toBe(hashWithoutSalt);
    });

    it('should use SHA-256 algorithm', () => {
      const ip = '192.168.1.1';
      const salt = 'test-salt';
      const service = new GeolocationService(salt);

      const hash = service.hashIp(ip);

      // Manually compute expected hash
      const expectedHash = crypto.createHash('sha256');
      expectedHash.update(salt + ip);
      const expected = expectedHash.digest('hex');

      expect(hash).toBe(expected);
    });

    it('should handle IPv6 addresses', () => {
      const ip = '2001:4860:4860::8888';

      const hash = service.hashIp(ip);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should handle empty IP string', () => {
      const ip = '';

      const hash = service.hashIp(ip);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });
  });

  describe('isPrivateIp', () => {
    it('should detect 10.x.x.x private range', () => {
      expect(service.isPrivateIp('10.0.0.1')).toBe(true);
      expect(service.isPrivateIp('10.255.255.255')).toBe(true);
      expect(service.isPrivateIp('10.123.45.67')).toBe(true);
    });

    it('should detect 192.168.x.x private range', () => {
      expect(service.isPrivateIp('192.168.0.1')).toBe(true);
      expect(service.isPrivateIp('192.168.1.1')).toBe(true);
      expect(service.isPrivateIp('192.168.255.255')).toBe(true);
    });

    it('should detect 172.16.x.x to 172.31.x.x private range', () => {
      expect(service.isPrivateIp('172.16.0.1')).toBe(true);
      expect(service.isPrivateIp('172.31.255.255')).toBe(true);
      expect(service.isPrivateIp('172.20.10.5')).toBe(true);
    });

    it('should not detect 172.15.x.x as private (outside range)', () => {
      expect(service.isPrivateIp('172.15.255.255')).toBe(false);
    });

    it('should not detect 172.32.x.x as private (outside range)', () => {
      expect(service.isPrivateIp('172.32.0.1')).toBe(false);
    });

    it('should detect 127.x.x.x localhost range', () => {
      expect(service.isPrivateIp('127.0.0.1')).toBe(true);
      expect(service.isPrivateIp('127.0.0.2')).toBe(true);
      expect(service.isPrivateIp('127.255.255.255')).toBe(true);
    });

    it('should detect IPv6 localhost ::1', () => {
      expect(service.isPrivateIp('::1')).toBe(true);
    });

    it('should detect IPv6 link-local fe80::', () => {
      expect(service.isPrivateIp('fe80::1')).toBe(true);
      expect(service.isPrivateIp('FE80::1')).toBe(true); // Case insensitive
    });

    it('should detect IPv6 unique local fc00::', () => {
      expect(service.isPrivateIp('fc00::1')).toBe(true);
      expect(service.isPrivateIp('FC00::1')).toBe(true); // Case insensitive
    });

    it('should not detect public IPs as private', () => {
      expect(service.isPrivateIp('8.8.8.8')).toBe(false); // Google DNS
      expect(service.isPrivateIp('1.1.1.1')).toBe(false); // Cloudflare DNS
      expect(service.isPrivateIp('208.67.222.222')).toBe(false); // OpenDNS
    });

    it('should not detect public IPv6 as private', () => {
      expect(service.isPrivateIp('2001:4860:4860::8888')).toBe(false); // Google DNS
    });

    it('should handle edge cases near private ranges', () => {
      expect(service.isPrivateIp('9.255.255.255')).toBe(false);
      expect(service.isPrivateIp('11.0.0.1')).toBe(false);
      expect(service.isPrivateIp('192.167.255.255')).toBe(false);
      expect(service.isPrivateIp('192.169.0.1')).toBe(false);
    });
  });

  describe('lookupCountryWithPrivacyCheck', () => {
    it('should return XX for private IP 10.x.x.x', () => {
      const ip = '10.0.0.1';

      const result = service.lookupCountryWithPrivacyCheck(ip);

      expect(result.country).toBe('XX');
      expect(result.ipHash).toBeDefined();
      expect(mockLookup).not.toHaveBeenCalled();
    });

    it('should return XX for private IP 192.168.x.x', () => {
      const ip = '192.168.1.1';

      const result = service.lookupCountryWithPrivacyCheck(ip);

      expect(result.country).toBe('XX');
      expect(result.ipHash).toBeDefined();
      expect(mockLookup).not.toHaveBeenCalled();
    });

    it('should return XX for private IP 172.16.x.x', () => {
      const ip = '172.16.0.1';

      const result = service.lookupCountryWithPrivacyCheck(ip);

      expect(result.country).toBe('XX');
      expect(result.ipHash).toBeDefined();
      expect(mockLookup).not.toHaveBeenCalled();
    });

    it('should return XX for localhost 127.0.0.1', () => {
      const ip = '127.0.0.1';

      const result = service.lookupCountryWithPrivacyCheck(ip);

      expect(result.country).toBe('XX');
      expect(result.ipHash).toBeDefined();
      expect(mockLookup).not.toHaveBeenCalled();
    });

    it('should return XX for IPv6 localhost ::1', () => {
      const ip = '::1';

      const result = service.lookupCountryWithPrivacyCheck(ip);

      expect(result.country).toBe('XX');
      expect(result.ipHash).toBeDefined();
      expect(mockLookup).not.toHaveBeenCalled();
    });

    it('should perform lookup for public IP', () => {
      const ip = '8.8.8.8';
      mockLookup.mockReturnValue({
        country: 'US',
        region: 'CA',
        timezone: 'America/Los_Angeles',
        ll: [37.751, -97.822],
        range: [134744064, 134744319],
        eu: '0',
        metro: 0,
        area: 1000,
      });

      const result = service.lookupCountryWithPrivacyCheck(ip);

      expect(result.country).toBe('US');
      expect(result.ipHash).toBeDefined();
      expect(mockLookup).toHaveBeenCalledWith(ip);
    });

    it('should still hash private IPs', () => {
      const privateIp = '192.168.1.1';

      const result = service.lookupCountryWithPrivacyCheck(privateIp);

      expect(result.ipHash).toBeDefined();
      expect(result.ipHash).toHaveLength(64);
    });
  });

  describe('IP validation', () => {
    it('should accept valid IPv4 addresses', () => {
      const validIps = [
        '0.0.0.0',
        '255.255.255.255',
        '192.168.1.1',
        '8.8.8.8',
        '127.0.0.1',
      ];

      validIps.forEach(ip => {
        mockLookup.mockReturnValue({ country: 'US', region: '', timezone: '', ll: [0, 0], range: [0, 0], eu: '0', metro: 0, area: 0 });
        const result = service.lookupCountry(ip);
        expect(result.country).not.toBe('XX');
      });
    });

    it('should reject invalid IPv4 addresses', () => {
      const invalidIps = [
        '256.1.1.1',
        '1.256.1.1',
        '1.1.256.1',
        '1.1.1.256',
        '999.999.999.999',
        'abc.def.ghi.jkl',
        '192.168.1',
        '192.168.1.1.1',
        '192.168.-1.1',
      ];

      invalidIps.forEach(ip => {
        const result = service.lookupCountry(ip);
        expect(result.country).toBe('XX');
      });
    });

    it('should accept valid IPv6 addresses', () => {
      const validIps = [
        '2001:4860:4860::8888',
        '::1',
        '::',
        'fe80::1',
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        '2001:db8::8a2e:370:7334',
      ];

      validIps.forEach(ip => {
        mockLookup.mockReturnValue({ country: 'US', region: '', timezone: '', ll: [0, 0], range: [0, 0], eu: '0', metro: 0, area: 0 });
        const result = service.lookupCountry(ip);
        expect(result.country).not.toBe('XX');
      });
    });

    it('should reject malformed IP addresses', () => {
      const invalidIps = [
        'not-an-ip',
        '192.168.1.1.1.1',
        '192.168',
        'http://192.168.1.1',
        '192.168.1.1/24',
      ];

      invalidIps.forEach(ip => {
        const result = service.lookupCountry(ip);
        expect(result.country).toBe('XX');
      });
    });
  });

  describe('constructor and salt handling', () => {
    it('should use provided salt', () => {
      const customSalt = 'my-custom-salt';
      const serviceWithCustomSalt = new GeolocationService(customSalt);

      const ip = '192.168.1.1';
      const hash = serviceWithCustomSalt.hashIp(ip);

      // Verify hash uses custom salt
      const expectedHash = crypto.createHash('sha256');
      expectedHash.update(customSalt + ip);
      const expected = expectedHash.digest('hex');

      expect(hash).toBe(expected);
    });

    it('should use config salt if no salt provided', () => {
      const serviceWithConfigSalt = new GeolocationService();

      const ip = '192.168.1.1';
      const hash = serviceWithConfigSalt.hashIp(ip);

      // Should use config salt 'test-salt-for-hashing'
      const expectedHash = crypto.createHash('sha256');
      expectedHash.update('test-salt-for-hashing' + ip);
      const expected = expectedHash.digest('hex');

      expect(hash).toBe(expected);
    });

    it('should warn if salt is not configured', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Create service with empty salt
      const serviceWithoutSalt = new GeolocationService('');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('IP_HASH_SALT not configured')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should still hash with empty salt (not recommended)', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const serviceWithoutSalt = new GeolocationService('');

      const ip = '192.168.1.1';
      const hash = serviceWithoutSalt.hashIp(ip);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('singleton instance', () => {
    it('should export a default singleton instance', () => {
      const defaultService = require('../../../../services/geolocation').default;

      expect(defaultService).toBeInstanceOf(GeolocationService);
    });

    it('should allow creating multiple instances with different salts', () => {
      const service1 = new GeolocationService('salt1');
      const service2 = new GeolocationService('salt2');

      const ip = '192.168.1.1';
      const hash1 = service1.hashIp(ip);
      const hash2 = service2.hashIp(ip);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('GeolocationResult interface', () => {
    it('should return object with correct structure', () => {
      const ip = '8.8.8.8';
      mockLookup.mockReturnValue({
        country: 'US',
        region: 'CA',
        timezone: 'America/Los_Angeles',
        ll: [37.751, -97.822],
        range: [134744064, 134744319],
        eu: '0',
        metro: 0,
        area: 1000,
      });

      const result = service.lookupCountry(ip);

      expect(result).toHaveProperty('country');
      expect(result).toHaveProperty('ipHash');
      expect(typeof result.country).toBe('string');
      expect(result.country).toHaveLength(2); // 2-letter ISO code
      expect(typeof result.ipHash).toBe('string');
    });

    it('should not include original IP in result', () => {
      const ip = '8.8.8.8';
      mockLookup.mockReturnValue({
        country: 'US',
        region: 'CA',
        timezone: 'America/Los_Angeles',
        ll: [37.751, -97.822],
        range: [134744064, 134744319],
        eu: '0',
        metro: 0,
        area: 1000,
      });

      const result = service.lookupCountry(ip);

      expect(result).not.toHaveProperty('ip');
      expect(result).not.toHaveProperty('ipAddress');
      expect(JSON.stringify(result)).not.toContain(ip);
    });
  });

  describe('privacy features', () => {
    it('should never expose original IP in any method', () => {
      const ip = '8.8.8.8';
      mockLookup.mockReturnValue({
        country: 'US',
        region: 'CA',
        timezone: 'America/Los_Angeles',
        ll: [37.751, -97.822],
        range: [134744064, 134744319],
        eu: '0',
        metro: 0,
        area: 1000,
      });

      const result1 = service.lookupCountry(ip);
      const result2 = service.lookupCountryWithPrivacyCheck(ip);

      expect(JSON.stringify(result1)).not.toContain(ip);
      expect(JSON.stringify(result2)).not.toContain(ip);
    });

    it('should hash identical IPs to same value', () => {
      const ip = '8.8.8.8';
      mockLookup.mockReturnValue({ country: 'US', region: '', timezone: '', ll: [0, 0], range: [0, 0], eu: '0', metro: 0, area: 0 });

      const result1 = service.lookupCountry(ip);
      const result2 = service.lookupCountry(ip);

      expect(result1.ipHash).toBe(result2.ipHash);
    });

    it('should treat private IPs specially in privacy check', () => {
      const privateIp = '192.168.1.1';
      const publicIp = '8.8.8.8';

      mockLookup.mockReturnValue({ country: 'US', region: '', timezone: '', ll: [0, 0], range: [0, 0], eu: '0', metro: 0, area: 0 });

      const privateResult = service.lookupCountryWithPrivacyCheck(privateIp);
      const publicResult = service.lookupCountryWithPrivacyCheck(publicIp);

      expect(privateResult.country).toBe('XX');
      expect(publicResult.country).toBe('US');
      expect(mockLookup).toHaveBeenCalledTimes(1); // Only for public IP
    });
  });

  describe('edge cases', () => {
    it('should handle null from geoip lookup gracefully', () => {
      const ip = '1.2.3.4';
      mockLookup.mockReturnValue(null);

      const result = service.lookupCountry(ip);

      expect(result.country).toBe('XX');
      expect(result.ipHash).toBeDefined();
    });

    it('should handle undefined country from geoip lookup', () => {
      const ip = '1.2.3.4';
      mockLookup.mockReturnValue({
        country: undefined as any,
        region: '',
        timezone: '',
        ll: [0, 0],
        range: [0, 0],
        eu: '0',
        metro: 0,
        area: 0,
      });

      const result = service.lookupCountry(ip);

      expect(result.country).toBe('XX');
    });

    it('should handle very long IP strings', () => {
      const longIp = '1.'.repeat(1000) + '1';

      const result = service.lookupCountry(longIp);

      expect(result.country).toBe('XX');
    });

    it('should handle special characters in IP', () => {
      const invalidIp = '192.168.1.1; DROP TABLE users;';

      const result = service.lookupCountry(invalidIp);

      expect(result.country).toBe('XX');
    });
  });
});
