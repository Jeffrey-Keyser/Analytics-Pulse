import { ProjectId, ApiKey, Timestamp } from '../value-objects';

export interface AnalyticsProjectProps {
  id: ProjectId;
  name: string;
  domain: string;
  description?: string;
  apiKey: ApiKey;
  isActive: boolean;
  ownerUserId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class AnalyticsProject {
  private readonly _id: ProjectId;
  private readonly _name: string;
  private readonly _domain: string;
  private readonly _description?: string;
  private readonly _apiKey: ApiKey;
  private readonly _isActive: boolean;
  private readonly _ownerUserId?: string;
  private readonly _createdAt: Timestamp;
  private readonly _updatedAt: Timestamp;

  private constructor(props: AnalyticsProjectProps) {
    this._id = props.id;
    this._name = props.name;
    this._domain = props.domain;
    this._description = props.description;
    this._apiKey = props.apiKey;
    this._isActive = props.isActive;
    this._ownerUserId = props.ownerUserId;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: AnalyticsProjectProps): AnalyticsProject {
    // Validate business rules
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Project name cannot be empty');
    }

    if (props.name.length > 255) {
      throw new Error('Project name cannot exceed 255 characters');
    }

    if (!props.domain || props.domain.trim().length === 0) {
      throw new Error('Project domain cannot be empty');
    }

    // Validate domain format (basic check)
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(props.domain)) {
      throw new Error(`Invalid domain format: ${props.domain}`);
    }

    return new AnalyticsProject(props);
  }

  // Getters
  get id(): ProjectId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get domain(): string {
    return this._domain;
  }

  get description(): string | undefined {
    return this._description;
  }

  get apiKey(): ApiKey {
    return this._apiKey;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get ownerUserId(): string | undefined {
    return this._ownerUserId;
  }

  get createdAt(): Timestamp {
    return this._createdAt;
  }

  get updatedAt(): Timestamp {
    return this._updatedAt;
  }

  // Domain behavior
  canReceiveEvents(): boolean {
    return this._isActive;
  }

  isOwnedBy(userId: string): boolean {
    return this._ownerUserId === userId;
  }

  updateName(newName: string): AnalyticsProject {
    return AnalyticsProject.create({
      ...this.toProps(),
      name: newName,
      updatedAt: Timestamp.now(),
    });
  }

  updateDescription(newDescription: string): AnalyticsProject {
    return AnalyticsProject.create({
      ...this.toProps(),
      description: newDescription,
      updatedAt: Timestamp.now(),
    });
  }

  activate(): AnalyticsProject {
    if (this._isActive) {
      return this;
    }

    return AnalyticsProject.create({
      ...this.toProps(),
      isActive: true,
      updatedAt: Timestamp.now(),
    });
  }

  deactivate(): AnalyticsProject {
    if (!this._isActive) {
      return this;
    }

    return AnalyticsProject.create({
      ...this.toProps(),
      isActive: false,
      updatedAt: Timestamp.now(),
    });
  }

  regenerateApiKey(newApiKey: ApiKey): AnalyticsProject {
    return AnalyticsProject.create({
      ...this.toProps(),
      apiKey: newApiKey,
      updatedAt: Timestamp.now(),
    });
  }

  // Serialization
  toProps(): AnalyticsProjectProps {
    return {
      id: this._id,
      name: this._name,
      domain: this._domain,
      description: this._description,
      apiKey: this._apiKey,
      isActive: this._isActive,
      ownerUserId: this._ownerUserId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  toJSON() {
    return {
      id: this._id.toString(),
      name: this._name,
      domain: this._domain,
      description: this._description,
      apiKey: this._apiKey.toMaskedString(),
      isActive: this._isActive,
      ownerUserId: this._ownerUserId,
      createdAt: this._createdAt.toISO(),
      updatedAt: this._updatedAt.toISO(),
    };
  }

  equals(other: AnalyticsProject): boolean {
    return this._id.equals(other._id);
  }
}
