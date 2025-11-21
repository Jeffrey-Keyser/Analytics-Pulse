export class Milliseconds {
  private readonly value: number;

  private constructor(milliseconds: number) {
    this.value = milliseconds;
  }

  static create(milliseconds: number): Milliseconds {
    if (milliseconds < 0) {
      throw new Error('Milliseconds cannot be negative');
    }

    if (!Number.isFinite(milliseconds)) {
      throw new Error('Milliseconds must be a finite number');
    }

    return new Milliseconds(Math.round(milliseconds));
  }

  static fromSeconds(seconds: number): Milliseconds {
    return this.create(seconds * 1000);
  }

  toNumber(): number {
    return this.value;
  }

  toSeconds(): number {
    return this.value / 1000;
  }

  isFasterThan(threshold: Milliseconds): boolean {
    return this.value < threshold.value;
  }

  isSlowerThan(threshold: Milliseconds): boolean {
    return this.value > threshold.value;
  }

  static readonly FAST_RESPONSE = Milliseconds.create(100);
  static readonly ACCEPTABLE_RESPONSE = Milliseconds.create(500);
  static readonly SLOW_RESPONSE = Milliseconds.create(1000);

  toString(): string {
    if (this.value < 1000) {
      return `${this.value}ms`;
    }
    return `${this.toSeconds().toFixed(2)}s`;
  }

  equals(other: Milliseconds): boolean {
    return this.value === other.value;
  }
}
