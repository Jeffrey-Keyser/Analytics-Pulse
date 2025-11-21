import {
  AnalyticsPulseConfig,
  EventData,
  EventPayload,
  ApiResponse,
  QueuedEvent,
  PageViewMetadata,
} from './types';
import {
  isDoNotTrackEnabled,
  getPageUrl,
  getReferrer,
  getScreenDimensions,
  getUserAgent,
  isOutboundLink,
  deepMerge,
  debounce,
} from './utils';
import { SessionManager } from './session';
import { EventQueue } from './queue';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<AnalyticsPulseConfig> = {
  endpoint: 'https://api.analytics-pulse.com/api/v1/events',
  debug: false,
  autoTrack: true,
  trackOutboundLinks: false,
  excludedDomains: [],
  excludedPaths: [],
  pageViewDebounceTime: 300,
  trackHashChanges: false,
  customProps: {},
  respectDoNotTrack: true,
  maxRetries: 3,
  retryDelay: 1000,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  batchSize: 10,
  flushInterval: 5000,
  maxQueueSize: 100,
  enableBatching: true,
};

/**
 * AnalyticsPulse - Privacy-focused analytics tracking library
 *
 * @example
 * ```typescript
 * const analytics = new AnalyticsPulse('your-api-key', {
 *   debug: true,
 *   autoTrack: true
 * });
 *
 * // Track custom event
 * analytics.trackEvent('button_click', { button: 'signup' });
 * ```
 */
export class AnalyticsPulse {
  private apiKey: string;
  private config: Required<AnalyticsPulseConfig>;
  private sessionManager: SessionManager;
  private queue: EventQueue | null = null;
  private legacyEventQueue: QueuedEvent[] = []; // Legacy queue for backwards compatibility
  private isInitialized = false;
  private currentUrl: string;
  private previousUrl: string | null = null;
  private historyPatched = false;
  private debouncedPageView: ((...args: any[]) => void) | null = null;
  private initialReferrer: string;

  /**
   * Create a new AnalyticsPulse instance
   *
   * @param apiKey - Your Analytics Pulse API key
   * @param config - Optional configuration options
   */
  constructor(apiKey: string, config: AnalyticsPulseConfig = {}) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('AnalyticsPulse: API key is required');
    }

    this.apiKey = apiKey;
    this.config = deepMerge(DEFAULT_CONFIG, config);

    // Initialize session manager
    this.sessionManager = new SessionManager({
      sessionTimeout: this.config.sessionTimeout,
      debug: this.config.debug,
    });

    // Initialize event queue if batching is enabled
    if (this.config.enableBatching) {
      this.queue = new EventQueue(
        {
          batchSize: this.config.batchSize,
          flushInterval: this.config.flushInterval,
          maxQueueSize: this.config.maxQueueSize,
          debug: this.config.debug,
        },
        this.sendBatch.bind(this)
      );
    }

    // Initialize URL tracking
    this.currentUrl = getPageUrl();
    this.initialReferrer = getReferrer();

    this.log('Initializing AnalyticsPulse', {
      apiKey: this.maskApiKey(apiKey),
      config: this.config,
      visitorId: this.sessionManager.getVisitorId(),
      sessionId: this.sessionManager.getSessionId(),
    });

    // Check Do Not Track
    if (this.config.respectDoNotTrack && isDoNotTrackEnabled()) {
      this.log('Do Not Track is enabled, analytics will not be tracked');
      return;
    }

    this.initialize();
  }

  /**
   * Initialize the tracking library
   */
  private initialize(): void {
    if (this.isInitialized) {
      this.log('Already initialized, skipping');
      return;
    }

    // Set up automatic pageview tracking if enabled
    if (this.config.autoTrack) {
      this.enableAutoPageViewTracking();
      // Track initial page view
      this.trackPageView();
    }

    // Set up outbound link tracking if enabled
    if (this.config.trackOutboundLinks) {
      this.setupOutboundLinkTracking();
    }

    this.isInitialized = true;
    this.log('Initialization complete');
  }

  /**
   * Track a page view event
   *
   * @param metadata - Optional page metadata (title, category, etc.)
   */
  public trackPageView(metadata?: PageViewMetadata): void {
    const currentUrl = getPageUrl();

    // Check if path should be excluded
    if (!this.shouldTrackPath(currentUrl)) {
      this.log('Path excluded from tracking', currentUrl);
      return;
    }

    // Don't track if URL hasn't changed (prevents duplicate events)
    if (currentUrl === this.currentUrl && this.previousUrl !== null) {
      this.log('URL unchanged, skipping duplicate pageview', currentUrl);
      return;
    }

    const dimensions = getScreenDimensions();

    // Determine referrer: use initial referrer for first pageview, previous URL for subsequent
    const referrer = this.previousUrl === null ? this.initialReferrer : this.previousUrl;

    // Update URL tracking
    this.previousUrl = this.currentUrl;
    this.currentUrl = currentUrl;

    // Build event data with page metadata
    const props: Record<string, string | number | boolean> = {
      title: document.title,
      ...metadata,
    };

    const eventData: EventData = {
      name: 'page_view',
      url: currentUrl,
      referrer,
      screenWidth: dimensions.width,
      screenHeight: dimensions.height,
      userAgent: getUserAgent(),
      props,
      timestamp: Date.now(),
    };

    this.sendEvent(eventData);
  }

  /**
   * Track a custom event
   *
   * @param eventName - Name of the event (alphanumeric, underscores, and hyphens only)
   * @param data - Optional event data (supports nested objects, max 5KB)
   */
  public trackEvent(eventName: string, data?: Record<string, any>): void {
    // Validate event name
    if (!eventName || typeof eventName !== 'string') {
      this.log('Invalid event name: must be a non-empty string', eventName, 'error');
      return;
    }

    // Validate event name format (alphanumeric, underscores, hyphens only)
    const eventNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!eventNameRegex.test(eventName)) {
      this.log(
        'Invalid event name format: only alphanumeric characters, underscores, and hyphens are allowed',
        eventName,
        'error'
      );
      return;
    }

    // Validate custom data size (max 5KB)
    if (data !== undefined) {
      try {
        const dataSize = new Blob([JSON.stringify(data)]).size;
        const maxSize = 5 * 1024; // 5KB

        if (dataSize > maxSize) {
          this.log(
            `Custom data exceeds maximum size of ${maxSize} bytes (got ${dataSize} bytes)`,
            { eventName, dataSize },
            'error'
          );
          return;
        }
      } catch (error) {
        this.log('Failed to serialize custom data', { eventName, error }, 'error');
        return;
      }
    }

    const eventData: EventData = {
      name: eventName,
      url: getPageUrl(),
      userAgent: getUserAgent(),
      props: data,
      timestamp: Date.now(),
    };

    this.log('Tracking custom event', { eventName, data, sessionId: this.sessionManager.getSessionId() });
    this.sendEvent(eventData);
  }

  /**
   * Alias for trackEvent() - Track a custom event
   *
   * @param eventName - Name of the event (alphanumeric, underscores, and hyphens only)
   * @param data - Optional event data (supports nested objects, max 5KB)
   */
  public track(eventName: string, data?: Record<string, any>): void {
    this.trackEvent(eventName, data);
  }

  /**
   * Set up automatic outbound link tracking
   */
  private setupOutboundLinkTracking(): void {
    const currentDomain = window.location.hostname;

    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');

      if (!link || !link.href) {
        return;
      }

      const isOutbound = isOutboundLink(link.href, currentDomain);
      const isExcluded = this.config.excludedDomains.some((domain) =>
        link.href.includes(domain)
      );

      if (isOutbound && !isExcluded) {
        this.trackEvent('outbound_link', {
          url: link.href,
          text: link.textContent || '',
        });
      }
    });

    this.log('Outbound link tracking enabled');
  }

  /**
   * Send an event to the analytics API
   */
  private async sendEvent(eventData: EventData): Promise<void> {
    // Check Do Not Track again before sending
    if (this.config.respectDoNotTrack && isDoNotTrackEnabled()) {
      this.log('Do Not Track is enabled, event not sent');
      return;
    }

    // Merge custom properties from config
    if (Object.keys(this.config.customProps).length > 0) {
      eventData.props = {
        ...this.config.customProps,
        ...eventData.props,
      };
    }

    const payload: EventPayload = {
      apiKey: this.apiKey,
      event: eventData,
      sessionId: this.sessionManager.getSessionId(),
      visitorId: this.sessionManager.getVisitorId(),
    };

    this.log('Sending event', payload);

    // Use batching queue if enabled
    if (this.config.enableBatching && this.queue) {
      this.queue.add(payload);
      return;
    }

    // Otherwise send immediately with legacy retry queue
    try {
      const response = await this.makeRequest(payload);

      if (response.success) {
        this.log('Event sent successfully', response);
      } else {
        this.log('Event failed', response, 'error');
        this.queueEvent(payload);
      }
    } catch (error) {
      this.log('Event request failed', error, 'error');
      this.queueEvent(payload);
    }
  }

  /**
   * Make an HTTP request to the analytics API
   */
  private async makeRequest(payload: EventPayload): Promise<ApiResponse> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true, // Ensures requests complete even if page is unloaded
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Queue an event for retry (legacy queue)
   */
  private queueEvent(payload: EventPayload): void {
    this.legacyEventQueue.push({
      payload,
      retries: 0,
      queuedAt: Date.now(),
    });

    this.log('Event queued for retry', this.legacyEventQueue.length);
    this.processQueue();
  }

  /**
   * Process the legacy event queue and retry failed events
   */
  private async processQueue(): Promise<void> {
    if (this.legacyEventQueue.length === 0) {
      return;
    }

    const queuedEvent = this.legacyEventQueue[0];

    if (queuedEvent.retries >= this.config.maxRetries) {
      this.log('Max retries reached, removing from queue', queuedEvent);
      this.legacyEventQueue.shift();
      this.processQueue();
      return;
    }

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay));

    try {
      const response = await this.makeRequest(queuedEvent.payload);

      if (response.success) {
        this.log('Queued event sent successfully', response);
        this.legacyEventQueue.shift();
        this.processQueue();
      } else {
        queuedEvent.retries++;
        this.log('Queued event failed, will retry', queuedEvent);
        this.processQueue();
      }
    } catch (error) {
      queuedEvent.retries++;
      this.log('Queued event request failed, will retry', error, 'error');
      this.processQueue();
    }
  }

  /**
   * Send a batch of events to the API
   * Called by the EventQueue when flushing
   */
  private async sendBatch(events: EventPayload[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    this.log('Sending batch of events', { count: events.length });

    try {
      // Send events as a batch
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        this.log('Batch sent successfully', result);
      } else {
        throw new Error(result.error || 'Batch send failed');
      }
    } catch (error) {
      this.log('Batch send failed', error, 'error');
      throw error; // Re-throw so the queue can handle retry
    }
  }

  /**
   * Manually flush the event queue
   * Useful for ensuring events are sent before page unload
   */
  public async flush(): Promise<void> {
    if (this.queue) {
      await this.queue.flush();
    }
  }

  /**
   * Check if a path should be tracked based on exclusion patterns
   */
  private shouldTrackPath(url: string): boolean {
    if (this.config.excludedPaths.length === 0) {
      return true;
    }

    try {
      const urlObj = new URL(url, window.location.href);
      const pathname = urlObj.pathname;

      return !this.config.excludedPaths.some((pattern) => {
        if (pattern instanceof RegExp) {
          return pattern.test(pathname);
        }
        // Convert string pattern to regex
        const regex = new RegExp(pattern);
        return regex.test(pathname);
      });
    } catch (_error) {
      // If URL parsing fails, track by default
      return true;
    }
  }

  /**
   * Enable automatic pageview tracking for SPA navigation
   */
  private enableAutoPageViewTracking(): void {
    // Create debounced pageview handler
    this.debouncedPageView = debounce(
      () => this.trackPageView(),
      this.config.pageViewDebounceTime
    );

    // Set up History API interception
    this.setupHistoryInterception();

    // Listen for popstate events (back/forward buttons)
    window.addEventListener('popstate', () => {
      this.log('Popstate event detected');
      if (this.debouncedPageView) {
        this.debouncedPageView();
      }
    });

    // Optionally track hash changes
    if (this.config.trackHashChanges) {
      window.addEventListener('hashchange', () => {
        this.log('Hash change detected');
        if (this.debouncedPageView) {
          this.debouncedPageView();
        }
      });
      this.log('Hash change tracking enabled');
    }

    this.log('Automatic pageview tracking enabled');
  }

  /**
   * Intercept History API methods to track SPA navigation
   */
  private setupHistoryInterception(): void {
    if (this.historyPatched) {
      return;
    }

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // Monkey-patch pushState
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      originalPushState.apply(history, args);
      this.log('pushState called', args[2]);
      if (this.debouncedPageView) {
        this.debouncedPageView();
      }
    };

    // Monkey-patch replaceState
    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      originalReplaceState.apply(history, args);
      this.log('replaceState called', args[2]);
      if (this.debouncedPageView) {
        this.debouncedPageView();
      }
    };

    this.historyPatched = true;
    this.log('History API interception enabled');
  }

  /**
   * Enable or disable debug mode
   */
  public setDebug(enabled: boolean): void {
    this.config.debug = enabled;
    this.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current configuration
   */
  public getConfig(): Readonly<Required<AnalyticsPulseConfig>> {
    return { ...this.config };
  }

  /**
   * Get the current session ID
   */
  public getSessionId(): string {
    return this.sessionManager.getSessionId();
  }

  /**
   * Get the current visitor ID
   */
  public getVisitorId(): string {
    return this.sessionManager.getVisitorId();
  }

  /**
   * Check if this is a new session
   */
  public isNewSession(): boolean {
    return this.sessionManager.getIsNewSession();
  }

  /**
   * Manually end the current session and start a new one
   */
  public endSession(): void {
    this.sessionManager.endSession();
  }

  /**
   * Clean up resources (event listeners, timers, etc.)
   */
  public destroy(): void {
    if (this.queue) {
      this.queue.flush();
      this.queue.destroy();
    }
    this.sessionManager.destroy();
    this.log('AnalyticsPulse destroyed');
  }

  /**
   * Log debug messages
   */
  private log(message: string, data?: any, level: 'log' | 'error' = 'log'): void {
    if (this.config.debug) {
      const prefix = '[AnalyticsPulse]';
      if (data !== undefined) {
        console[level](prefix, message, data);
      } else {
        console[level](prefix, message);
      }
    }
  }

  /**
   * Mask API key for logging (show first 4 and last 4 characters)
   */
  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '****';
    }
    return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
  }
}
