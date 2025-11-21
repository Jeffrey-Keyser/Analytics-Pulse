export class Memory {
  private readonly bytes: number;

  private constructor(bytes: number) {
    this.bytes = bytes;
  }

  static fromBytes(bytes: number): Memory {
    if (bytes < 0) {
      throw new Error('Memory cannot be negative');
    }

    if (!Number.isFinite(bytes)) {
      throw new Error('Memory must be a finite number');
    }

    return new Memory(Math.round(bytes));
  }

  static fromMegabytes(megabytes: number): Memory {
    return Memory.fromBytes(megabytes * 1024 * 1024);
  }

  static fromKilobytes(kilobytes: number): Memory {
    return Memory.fromBytes(kilobytes * 1024);
  }

  toBytes(): number {
    return this.bytes;
  }

  toKilobytes(): number {
    return this.bytes / 1024;
  }

  toMegabytes(): number {
    return this.bytes / (1024 * 1024);
  }

  toGigabytes(): number {
    return this.bytes / (1024 * 1024 * 1024);
  }

  exceeds(threshold: Memory): boolean {
    return this.bytes > threshold.bytes;
  }

  isBelow(threshold: Memory): boolean {
    return this.bytes < threshold.bytes;
  }

  static readonly HEALTHY_THRESHOLD = Memory.fromMegabytes(500);
  static readonly CRITICAL_THRESHOLD = Memory.fromMegabytes(1000);

  evaluateHealth(): 'healthy' | 'degraded' | 'critical' {
    if (this.exceeds(Memory.CRITICAL_THRESHOLD)) {
      return 'critical';
    }
    if (this.exceeds(Memory.HEALTHY_THRESHOLD)) {
      return 'degraded';
    }
    return 'healthy';
  }

  toString(): string {
    const mb = this.toMegabytes();
    if (mb < 1) {
      return `${this.toKilobytes().toFixed(2)}KB`;
    }
    if (mb < 1024) {
      return `${mb.toFixed(2)}MB`;
    }
    return `${this.toGigabytes().toFixed(2)}GB`;
  }

  equals(other: Memory): boolean {
    return this.bytes === other.bytes;
  }
}
