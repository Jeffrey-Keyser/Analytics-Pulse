import { ProjectId, SessionId, EventType, IPHash, Timestamp } from '../value-objects';

export interface AnalyticsEventProps {
  id?: string; // UUID, optional for creation
  projectId: ProjectId;
  sessionId: SessionId;
  eventType: EventType;
  eventName?: string;
  pageUrl: string;
  pageTitle?: string;
  referrer?: string;
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  deviceType?: string;
  countryCode?: string;
  ipHash?: IPHash;
  properties?: Record<string, any>;
  timestamp: Timestamp;
  pageLoadTime?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export class AnalyticsEvent {
  private readonly _id?: string;
  private readonly _projectId: ProjectId;
  private readonly _sessionId: SessionId;
  private readonly _eventType: EventType;
  private readonly _eventName?: string;
  private readonly _pageUrl: string;
  private readonly _pageTitle?: string;
  private readonly _referrer?: string;
  private readonly _userAgent?: string;
  private readonly _browser?: string;
  private readonly _browserVersion?: string;
  private readonly _os?: string;
  private readonly _osVersion?: string;
  private readonly _deviceType?: string;
  private readonly _countryCode?: string;
  private readonly _ipHash?: IPHash;
  private readonly _properties?: Record<string, any>;
  private readonly _timestamp: Timestamp;
  private readonly _pageLoadTime?: number;
  private readonly _utmSource?: string;
  private readonly _utmMedium?: string;
  private readonly _utmCampaign?: string;
  private readonly _utmTerm?: string;
  private readonly _utmContent?: string;

  private constructor(props: AnalyticsEventProps) {
    this._id = props.id;
    this._projectId = props.projectId;
    this._sessionId = props.sessionId;
    this._eventType = props.eventType;
    this._eventName = props.eventName;
    this._pageUrl = props.pageUrl;
    this._pageTitle = props.pageTitle;
    this._referrer = props.referrer;
    this._userAgent = props.userAgent;
    this._browser = props.browser;
    this._browserVersion = props.browserVersion;
    this._os = props.os;
    this._osVersion = props.osVersion;
    this._deviceType = props.deviceType;
    this._countryCode = props.countryCode;
    this._ipHash = props.ipHash;
    this._properties = props.properties;
    this._timestamp = props.timestamp;
    this._pageLoadTime = props.pageLoadTime;
    this._utmSource = props.utmSource;
    this._utmMedium = props.utmMedium;
    this._utmCampaign = props.utmCampaign;
    this._utmTerm = props.utmTerm;
    this._utmContent = props.utmContent;
  }

  static create(props: AnalyticsEventProps): AnalyticsEvent {
    // Validate business rules
    if (!props.pageUrl || props.pageUrl.trim().length === 0) {
      throw new Error('Page URL cannot be empty');
    }

    // Validate URL format
    try {
      new URL(props.pageUrl);
    } catch {
      throw new Error(`Invalid page URL format: ${props.pageUrl}`);
    }

    // Validate custom event has a name
    if (props.eventType.isCustom() && (!props.eventName || props.eventName.trim().length === 0)) {
      throw new Error('Custom events must have an event name');
    }

    // Validate page load time is non-negative
    if (props.pageLoadTime !== undefined && props.pageLoadTime < 0) {
      throw new Error('Page load time cannot be negative');
    }

    return new AnalyticsEvent(props);
  }

  // Factory methods
  static createPageView(props: Omit<AnalyticsEventProps, 'eventType'>): AnalyticsEvent {
    return AnalyticsEvent.create({
      ...props,
      eventType: EventType.pageview(),
    });
  }

  static createCustomEvent(props: Omit<AnalyticsEventProps, 'eventType'> & { eventName: string }): AnalyticsEvent {
    return AnalyticsEvent.create({
      ...props,
      eventType: EventType.custom(),
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

  get eventType(): EventType {
    return this._eventType;
  }

  get eventName(): string | undefined {
    return this._eventName;
  }

  get pageUrl(): string {
    return this._pageUrl;
  }

  get pageTitle(): string | undefined {
    return this._pageTitle;
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

  get properties(): Record<string, any> | undefined {
    return this._properties;
  }

  get timestamp(): Timestamp {
    return this._timestamp;
  }

  get pageLoadTime(): number | undefined {
    return this._pageLoadTime;
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

  // Domain behavior
  isPageView(): boolean {
    return this._eventType.isPageView();
  }

  isCustomEvent(): boolean {
    return this._eventType.isCustom();
  }

  hasUTMParameters(): boolean {
    return !!(this._utmSource || this._utmMedium || this._utmCampaign);
  }

  isFromReferrer(): boolean {
    return !!this._referrer && this._referrer.trim().length > 0;
  }

  isSlowPageLoad(): boolean {
    // Consider page load > 3 seconds as slow
    return this._pageLoadTime !== undefined && this._pageLoadTime > 3000;
  }

  belongsToProject(projectId: ProjectId): boolean {
    return this._projectId.equals(projectId);
  }

  belongsToSession(sessionId: SessionId): boolean {
    return this._sessionId.equals(sessionId);
  }

  // Serialization
  toProps(): AnalyticsEventProps {
    return {
      id: this._id,
      projectId: this._projectId,
      sessionId: this._sessionId,
      eventType: this._eventType,
      eventName: this._eventName,
      pageUrl: this._pageUrl,
      pageTitle: this._pageTitle,
      referrer: this._referrer,
      userAgent: this._userAgent,
      browser: this._browser,
      browserVersion: this._browserVersion,
      os: this._os,
      osVersion: this._osVersion,
      deviceType: this._deviceType,
      countryCode: this._countryCode,
      ipHash: this._ipHash,
      properties: this._properties,
      timestamp: this._timestamp,
      pageLoadTime: this._pageLoadTime,
      utmSource: this._utmSource,
      utmMedium: this._utmMedium,
      utmCampaign: this._utmCampaign,
      utmTerm: this._utmTerm,
      utmContent: this._utmContent,
    };
  }

  toJSON() {
    return {
      id: this._id,
      projectId: this._projectId.toString(),
      sessionId: this._sessionId.toString(),
      eventType: this._eventType.toString(),
      eventName: this._eventName,
      pageUrl: this._pageUrl,
      pageTitle: this._pageTitle,
      referrer: this._referrer,
      userAgent: this._userAgent,
      browser: this._browser,
      browserVersion: this._browserVersion,
      os: this._os,
      osVersion: this._osVersion,
      deviceType: this._deviceType,
      countryCode: this._countryCode,
      ipHash: this._ipHash?.toString(),
      properties: this._properties,
      timestamp: this._timestamp.toISO(),
      pageLoadTime: this._pageLoadTime,
      utmSource: this._utmSource,
      utmMedium: this._utmMedium,
      utmCampaign: this._utmCampaign,
      utmTerm: this._utmTerm,
      utmContent: this._utmContent,
    };
  }

  equals(other: AnalyticsEvent): boolean {
    return this._id === other._id;
  }
}
