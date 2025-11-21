export class Timestamp {
  private readonly value: Date;

  private constructor(date: Date) {
    this.value = date;
  }

  static create(date: Date): Timestamp {
    if (!(date instanceof Date)) {
      throw new Error('Invalid date object');
    }

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date value');
    }

    return new Timestamp(date);
  }

  static now(): Timestamp {
    return new Timestamp(new Date());
  }

  static fromISO(isoString: string): Timestamp {
    if (!isoString || isoString.trim().length === 0) {
      throw new Error('ISO string cannot be empty');
    }

    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid ISO date string: ${isoString}`);
    }

    return new Timestamp(date);
  }

  static fromUnixTimestamp(unixTimestamp: number): Timestamp {
    if (!Number.isFinite(unixTimestamp)) {
      throw new Error('Unix timestamp must be a finite number');
    }

    const date = new Date(unixTimestamp * 1000);
    return new Timestamp(date);
  }

  toDate(): Date {
    return new Date(this.value.getTime());
  }

  toISO(): string {
    return this.value.toISOString();
  }

  toUnixTimestamp(): number {
    return Math.floor(this.value.getTime() / 1000);
  }

  isBefore(other: Timestamp): boolean {
    return this.value.getTime() < other.value.getTime();
  }

  isAfter(other: Timestamp): boolean {
    return this.value.getTime() > other.value.getTime();
  }

  isWithinLast(minutes: number): boolean {
    const now = new Date();
    const threshold = new Date(now.getTime() - minutes * 60 * 1000);
    return this.value >= threshold;
  }

  toString(): string {
    return this.value.toISOString();
  }

  equals(other: Timestamp): boolean {
    return this.value.getTime() === other.value.getTime();
  }
}
