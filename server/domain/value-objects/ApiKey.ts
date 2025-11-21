export class ApiKey {
  private readonly value: string;

  private constructor(key: string) {
    this.value = key;
  }

  static create(key: string): ApiKey {
    if (!key || key.trim().length === 0) {
      throw new Error('ApiKey cannot be empty');
    }

    const trimmedKey = key.trim();

    // API key should be 64 hexadecimal characters
    if (trimmedKey.length !== 64) {
      throw new Error('ApiKey must be 64 characters long');
    }

    const hexRegex = /^[0-9a-f]{64}$/i;
    if (!hexRegex.test(trimmedKey)) {
      throw new Error('ApiKey must contain only hexadecimal characters');
    }

    return new ApiKey(trimmedKey.toLowerCase());
  }

  toString(): string {
    return this.value;
  }

  toMaskedString(): string {
    // Show first 8 and last 4 characters, mask the rest
    return `${this.value.slice(0, 8)}...${this.value.slice(-4)}`;
  }

  equals(other: ApiKey): boolean {
    return this.value === other.value;
  }
}
