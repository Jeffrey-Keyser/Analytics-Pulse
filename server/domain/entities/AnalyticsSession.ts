import { ProjectId, SessionId, IPHash, Timestamp } from '../value-objects';

export interface AnalyticsSessionProps {
  id?: string; // UUID, optional for creation
  projectId: ProjectId;
  sessionId: SessionId;
  firstPageUrl: string;
  lastPageUrl?: string;
  referrer?: string;
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  deviceType?: string;
  countryCode?: string;
  ipHash?: IPHash;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  pageViewCount: number;
  eventCount: number;
  startedAt: Timestamp;
  lastActivityAt: Timestamp;
  endedAt?: Timestamp;
  durationSeconds?: number;
  isBounce: boolean;
}

export class AnalyticsSession {
  private readonly _id?: string;
  private readonly _projectId: ProjectId;
  private readonly _sessionId: SessionId;
  private readonly _firstPageUrl: string;
  private readonly _lastPageUrl?: string;
  private readonly _referrer?: string;
  private readonly _userAgent?: string;
  private readonly _browser?: string;
  private readonly _browserVersion?: string;
  private readonly _os?: string;
  private readonly _osVersion?: string;
  private readonly _deviceType?: string;
  private readonly _countryCode?: string;
  private readonly _ipHash?: IPHash;
  private readonly _utmSource?: string;
  private readonly _utmMedium?: string;
  private readonly _utmCampaign?: string;
  private readonly _utmTerm?: string;
  private readonly _utmContent?: string;
  private readonly _pageViewCount: number;
  private readonly _eventCount: number;
  private readonly _startedAt: Timestamp;
  private readonly _lastActivityAt: Timestamp;
  private readonly _endedAt?: Timestamp;
  private readonly _durationSeconds?: number;
  private readonly _isBounce: boolean;

  private constructor(props: AnalyticsSessionProps) {
    this._id = props.id;
    this._projectId = props.projectId;
    this._sessionId = props.sessionId;
    this._firstPageUrl = props.firstPageUrl;
    this._lastPageUrl = props.lastPageUrl;
    this._referrer = props.referrer;
    this._userAgent = props.userAgent;
    this._browser = props.browser;
    this._browserVersion = props.browserVersion;
    this._os = props.os;
    this._osVersion = props.osVersion;
    this._deviceType = props.deviceType;
    this._countryCode = props.countryCode;
    this._ipHash = props.ipHash;
    this._utmSource = props.utmSource;
    this._utmMedium = props.utmMedium;
    this._utmCampaign = props.utmCampaign;
    this._utmTerm = props.utmTerm;
    this._utmContent = props.utmContent;
    this._pageViewCount = props.pageViewCount;
    this._eventCount = props.eventCount;
    this._startedAt = props.startedAt;
    this._lastActivityAt = props.lastActivityAt;
    this._endedAt = props.endedAt;
    this._durationSeconds = props.durationSeconds;
    this._isBounce = props.isBounce;
  }

  static create(props: AnalyticsSessionProps): AnalyticsSession {
    // Validate business rules
    if (!props.firstPageUrl || props.firstPageUrl.trim().length === 0) {
      throw new Error('First page URL cannot be empty');
    }

    // Validate URL format
    try {
      new URL(props.firstPageUrl);
    } catch {
      throw new Error(`Invalid first page URL format: ${props.firstPageUrl}`);
    }

    // Validate counts are non-negative
    if (props.pageViewCount < 0) {
      throw new Error('Page view count cannot be negative');
    }

    if (props.eventCount < 0) {
      throw new Error('Event count cannot be negative');
    }

    // Validate duration is non-negative
    if (props.durationSeconds !== undefined && props.durationSeconds < 0) {
      throw new Error('Duration seconds cannot be negative');
    }

    // Validate lastActivityAt is not before startedAt
    if (props.lastActivityAt.isBefore(props.startedAt)) {
      throw new Error('Last activity time cannot be before start time');
    }

    return new AnalyticsSession(props);
  }

  // Factory method for new session
  static createNew(props: Omit<AnalyticsSessionProps, 'pageViewCount' | 'eventCount' | 'startedAt' | 'lastActivityAt' | 'isBounce'>): AnalyticsSession {
    const now = Timestamp.now();
    return AnalyticsSession.create({
      ...props,
      pageViewCount: 1,
      eventCount: 0,
      startedAt: now,
      lastActivityAt: now,
      isBounce: false,
    });
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get projectId(): ProjectId {
    return this._projectId;
  }

  get sessionId(): SessionId {
    return this._sessionId;
  }

  get firstPageUrl(): string {
    return this._firstPageUrl;
  }

  get lastPageUrl(): string | undefined {
    return this._lastPageUrl;
  }

  get referrer(): string | undefined {
    return this._referrer;
  }

  get userAgent(): string | undefined {
    return this._userAgent;
  }

  get browser(): string | undefined {
    return this._browser;
  }

  get browserVersion(): string | undefined {
    return this._browserVersion;
  }

  get os(): string | undefined {
    return this._os;
  }

  get osVersion(): string | undefined {
    return this._osVersion;
  }

  get deviceType(): string | undefined {
    return this._deviceType;
  }

  get countryCode(): string | undefined {
    return this._countryCode;
  }

  get ipHash(): IPHash | undefined {
    return this._ipHash;
  }

  get utmSource(): string | undefined {
    return this._utmSource;
  }

  get utmMedium(): string | undefined {
    return this._utmMedium;
  }

  get utmCampaign(): string | undefined {
    return this._utmCampaign;
  }

  get utmTerm(): string | undefined {
    return this._utmTerm;
  }

  get utmContent(): string | undefined {
    return this._utmContent;
  }

  get pageViewCount(): number {
    return this._pageViewCount;
  }

  get eventCount(): number {
    return this._eventCount;
  }

  get startedAt(): Timestamp {
    return this._startedAt;
  }

  get lastActivityAt(): Timestamp {
    return this._lastActivityAt;
  }

  get endedAt(): Timestamp | undefined {
    return this._endedAt;
  }

  get durationSeconds(): number | undefined {
    return this._durationSeconds;
  }

  get isBounce(): boolean {
    return this._isBounce;
  }

  // Domain behavior
  isActive(): boolean {
    // Session is active if not ended and last activity within 30 minutes
    return !this._endedAt && this._lastActivityAt.isWithinLast(30);
  }

  isEnded(): boolean {
    return !!this._endedAt;
  }

  hasUTMParameters(): boolean {
    return !!(this._utmSource || this._utmMedium || this._utmCampaign);
  }

  hasReferrer(): boolean {
    return !!this._referrer && this._referrer.trim().length > 0;
  }

  isEngaged(): boolean {
    // Engaged if more than 1 page view OR duration > 10 seconds
    return this._pageViewCount > 1 || (this._durationSeconds !== undefined && this._durationSeconds > 10);
  }

  getDurationMinutes(): number | undefined {
    if (this._durationSeconds === undefined) {
      return undefined;
    }
    return Math.round(this._durationSeconds / 60);
  }

  belongsToProject(projectId: ProjectId): boolean {
    return this._projectId.equals(projectId);
  }

  // Update methods (return new instances)
  recordActivity(pageUrl: string, isPageView: boolean = true): AnalyticsSession {
    return AnalyticsSession.create({
      ...this.toProps(),
      lastPageUrl: pageUrl,
      lastActivityAt: Timestamp.now(),
      pageViewCount: isPageView ? this._pageViewCount + 1 : this._pageViewCount,
      eventCount: !isPageView ? this._eventCount + 1 : this._eventCount,
    });
  }

  endSession(): AnalyticsSession {
    if (this._endedAt) {
      return this; // Already ended
    }

    const now = Timestamp.now();
    const durationSeconds = Math.floor(
      (this._lastActivityAt.toDate().getTime() - this._startedAt.toDate().getTime()) / 1000
    );

    // Calculate if it's a bounce (single page view with short duration)
    const isBounce = this._pageViewCount === 1 && durationSeconds < 10;

    return AnalyticsSession.create({
      ...this.toProps(),
      endedAt: now,
      durationSeconds,
      isBounce,
    });
  }

  // Serialization
  toProps(): AnalyticsSessionProps {
    return {
      id: this._id,
      projectId: this._projectId,
      sessionId: this._sessionId,
      firstPageUrl: this._firstPageUrl,
      lastPageUrl: this._lastPageUrl,
      referrer: this._referrer,
      userAgent: this._userAgent,
      browser: this._browser,
      browserVersion: this._browserVersion,
      os: this._os,
      osVersion: this._osVersion,
      deviceType: this._deviceType,
      countryCode: this._countryCode,
      ipHash: this._ipHash,
      utmSource: this._utmSource,
      utmMedium: this._utmMedium,
      utmCampaign: this._utmCampaign,
      utmTerm: this._utmTerm,
      utmContent: this._utmContent,
      pageViewCount: this._pageViewCount,
      eventCount: this._eventCount,
      startedAt: this._startedAt,
      lastActivityAt: this._lastActivityAt,
      endedAt: this._endedAt,
      durationSeconds: this._durationSeconds,
      isBounce: this._isBounce,
    };
  }

  toJSON() {
    return {
      id: this._id,
      projectId: this._projectId.toString(),
      sessionId: this._sessionId.toString(),
      firstPageUrl: this._firstPageUrl,
      lastPageUrl: this._lastPageUrl,
      referrer: this._referrer,
      userAgent: this._userAgent,
      browser: this._browser,
      browserVersion: this._browserVersion,
      os: this._os,
      osVersion: this._osVersion,
      deviceType: this._deviceType,
      countryCode: this._countryCode,
      ipHash: this._ipHash?.toString(),
      utmSource: this._utmSource,
      utmMedium: this._utmMedium,
      utmCampaign: this._utmCampaign,
      utmTerm: this._utmTerm,
      utmContent: this._utmContent,
      pageViewCount: this._pageViewCount,
      eventCount: this._eventCount,
      startedAt: this._startedAt.toISO(),
      lastActivityAt: this._lastActivityAt.toISO(),
      endedAt: this._endedAt?.toISO(),
      durationSeconds: this._durationSeconds,
      isBounce: this._isBounce,
    };
  }

  equals(other: AnalyticsSession): boolean {
    return this._sessionId.equals(other._sessionId);
  }
}
