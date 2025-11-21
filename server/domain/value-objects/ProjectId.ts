export class ProjectId {
  private readonly value: string;

  private constructor(id: string) {
    this.value = id;
  }

  static create(id: string): ProjectId {
    if (!id || id.trim().length === 0) {
      throw new Error('ProjectId cannot be empty');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id.trim())) {
      throw new Error(`Invalid ProjectId format: ${id}`);
    }

    return new ProjectId(id.trim().toLowerCase());
  }

  toString(): string {
    return this.value;
  }

  equals(other: ProjectId): boolean {
    return this.value === other.value;
  }
}
