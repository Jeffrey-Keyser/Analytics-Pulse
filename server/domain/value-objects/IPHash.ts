import crypto from 'crypto';

export class IPHash {
  private readonly value: string;

  private constructor(hash: string) {
    this.value = hash;
  }

  static create(hash: string): IPHash {
    if (!hash || hash.trim().length === 0) {
      throw new Error('IPHash cannot be empty');
    }

    const trimmedHash = hash.trim();

    // SHA256 produces 64 hexadecimal characters
    if (trimmedHash.length !== 64) {
      throw new Error('IPHash must be 64 characters long (SHA256)');
    }

    const hexRegex = /^[0-9a-f]{64}$/i;
    if (!hexRegex.test(trimmedHash)) {
      throw new Error('IPHash must contain only hexadecimal characters');
    }

    return new IPHash(trimmedHash.toLowerCase());
  }

  static fromIPAddress(ipAddress: string, salt: string = ''): IPHash {
    if (!ipAddress || ipAddress.trim().length === 0) {
      throw new Error('IP address cannot be empty');
    }

    // Anonymize IP address by hashing it with salt
    const hash = crypto
      .createHash('sha256')
      .update(ipAddress + salt)
      .digest('hex');

    return new IPHash(hash);
  }

  toString(): string {
    return this.value;
  }

  equals(other: IPHash): boolean {
    return this.value === other.value;
  }
}
