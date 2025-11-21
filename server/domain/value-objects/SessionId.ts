export class SessionId {
  private readonly value: string;

  private constructor(id: string) {
    this.value = id;
  }

  static create(id: string): SessionId {
    if (!id || id.trim().length === 0) {
      throw new Error('SessionId cannot be empty');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id.trim())) {
      throw new Error(`Invalid SessionId format: ${id}`);
    }

    return new SessionId(id.trim().toLowerCase());
  }

  toString(): string {
    return this.value;
  }

  equals(other: SessionId): boolean {
    return this.value === other.value;
  }
}
