import geoip from 'geoip-lite';
import crypto from 'crypto';
import config from '../config/env';

export interface GeolocationResult {
  country: string;      // 2-letter ISO country code (e.g., "US", "GB")
  ipHash?: string;      // SHA-256 hash of IP (optional, for privacy)
}

export class GeolocationService {
  private salt: string;

  constructor(salt?: string) {
    // Use provided salt or get from config
    this.salt = salt || config.IP_HASH_SALT || '';

    if (!this.salt) {
      console.warn('⚠️  IP_HASH_SALT not configured. IP hashing will use empty salt (not recommended for production).');
    }
  }

  /**
   * Lookup country from IP address (privacy-focused)
   *
   * @param ipAddress - IPv4 or IPv6 address
   * @returns Geolocation result with country code and hashed IP
   */
  lookupCountry(ipAddress: string): GeolocationResult {
    // Validate IP address format
    if (!this.isValidIp(ipAddress)) {
      return {
        country: 'XX', // Unknown/invalid
      };
    }

    // Perform geolocation lookup
    const geo = geoip.lookup(ipAddress);

    // Get country code or default to XX
    const country = geo?.country || 'XX';

    // Hash the IP address for privacy
    const ipHash = this.hashIp(ipAddress);

    return {
      country,
      ipHash,
    };
  }

  /**
   * Hash an IP address using SHA-256 with salt
   * IMPORTANT: Never log or store the original IP address
   *
   * @param ipAddress - The IP address to hash
   * @returns SHA-256 hash as hex string
   */
  hashIp(ipAddress: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(this.salt + ipAddress);
    return hash.digest('hex');
  }

  /**
   * Validate IP address format (IPv4 or IPv6)
   */
  private isValidIp(ipAddress: string): boolean {
    // Basic IPv4 validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

    // Basic IPv6 validation (simplified - accepts various formats)
    const ipv6Regex = /^([\da-fA-F]{0,4}:){2,7}[\da-fA-F]{0,4}$/;

    if (ipv4Regex.test(ipAddress)) {
      // Validate IPv4 octets are 0-255
      const octets = ipAddress.split('.');
      return octets.every(octet => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      });
    }

    if (ipv6Regex.test(ipAddress)) {
      return true;
    }

    // Check for IPv6 localhost and compressed formats
    if (ipAddress === '::1' || ipAddress === '::' || ipAddress.includes('::')) {
      return true;
    }

    return false;
  }

  /**
   * Check if an IP is a private/local address
   * Useful for filtering out local development IPs
   */
  isPrivateIp(ipAddress: string): boolean {
    // Common private IP ranges
    const privateRanges = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^127\./,                   // 127.0.0.0/8 (localhost)
      /^::1$/,                    // IPv6 localhost
      /^fe80:/i,                  // IPv6 link-local
      /^fc00:/i,                  // IPv6 unique local
    ];

    return privateRanges.some(pattern => pattern.test(ipAddress));
  }

  /**
   * Get geolocation with privacy checks
   * Returns 'XX' for private IPs and localhost
   */
  lookupCountryWithPrivacyCheck(ipAddress: string): GeolocationResult {
    // Don't geolocate private/local IPs
    if (this.isPrivateIp(ipAddress)) {
      return {
        country: 'XX',
        ipHash: this.hashIp(ipAddress),
      };
    }

    return this.lookupCountry(ipAddress);
  }
}

// Export singleton instance
export default new GeolocationService();
