export class EventType {
  private readonly value: string;

  private constructor(type: string) {
    this.value = type;
  }

  static readonly PAGEVIEW = 'pageview';
  static readonly CUSTOM = 'custom';

  static create(type: string): EventType {
    if (!type || type.trim().length === 0) {
      throw new Error('EventType cannot be empty');
    }

    const trimmedType = type.trim().toLowerCase();

    // Validate that it's a known event type
    const validTypes = [EventType.PAGEVIEW, EventType.CUSTOM];
    if (!validTypes.includes(trimmedType)) {
      throw new Error(`Invalid EventType: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }

    return new EventType(trimmedType);
  }

  static pageview(): EventType {
    return new EventType(EventType.PAGEVIEW);
  }

  static custom(): EventType {
    return new EventType(EventType.CUSTOM);
  }

  toString(): string {
    return this.value;
  }

  isPageView(): boolean {
    return this.value === EventType.PAGEVIEW;
  }

  isCustom(): boolean {
    return this.value === EventType.CUSTOM;
  }

  equals(other: EventType): boolean {
    return this.value === other.value;
  }
}
