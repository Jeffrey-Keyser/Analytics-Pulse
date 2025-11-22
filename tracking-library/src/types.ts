/**
 * Configuration options for the AnalyticsPulse tracking library
 */
export interface AnalyticsPulseConfig {
  /**
   * The API endpoint URL for sending events
   * @default 'https://api.analytics-pulse.com/api/v1/events'
   */
  endpoint?: string;

  /**
   * Enable debug mode for verbose logging
   * @default false
   */
  debug?: boolean;

  /**
   * Automatically track page views on initialization and route changes
   * @default true
   */
  autoTrack?: boolean;

  /**
   * Automatically track outbound link clicks
   * @default false
   */
  trackOutboundLinks?: boolean;

  /**
   * Domains to exclude from outbound link tracking
   * @default []
   */
  excludedDomains?: string[];

  /**
   * Paths to exclude from automatic pageview tracking (regex patterns)
   * @default []
   */
  excludedPaths?: (string | RegExp)[];

  /**
   * Debounce time in milliseconds for pageview events
   * @default 300
   */
  pageViewDebounceTime?: number;

  /**
   * Track hash changes for hash-based routing (e.g., #/page)
   * @default false
   */
  trackHashChanges?: boolean;

  /**
   * Custom properties to include with every event (supports nested objects)
   * @default {}
   */
  customProps?: Record<string, any>;

  /**
   * Respect Do Not Track browser setting
   * @default true
   */
  respectDoNotTrack?: boolean;

  /**
   * Maximum number of retry attempts for failed requests
   * @default 3
   */
  maxRetries?: number;

  /**
   * Delay in milliseconds before retrying failed requests
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Session timeout in milliseconds (period of inactivity before starting a new session)
   * @default 1800000 (30 minutes)
   */
  sessionTimeout?: number;

  /**
   * Maximum number of events to batch before flushing
   * @default 10
   */
  batchSize?: number;

  /**
   * Time interval in milliseconds to flush the event queue
   * @default 5000 (5 seconds)
   */
  flushInterval?: number;

  /**
   * Maximum number of events to store in the queue
   * @default 100
   */
  maxQueueSize?: number;

  /**
   * Enable event batching and queue system
   * @default true
   */
  enableBatching?: boolean;
}

/**
 * Page metadata for pageview tracking
 */
export interface PageViewMetadata {
  /**
   * Page title
   */
  title?: string;

  /**
   * Page category or section
   */
  category?: string;

  /**
   * Additional custom properties
   */
  [key: string]: string | number | boolean | undefined;
}

/**
 * UTM parameter interface for campaign tracking
 */
export interface UTMParams {
  /**
   * Campaign source (e.g., 'google', 'facebook', 'newsletter')
   */
  utm_source?: string;

  /**
   * Campaign medium (e.g., 'cpc', 'email', 'social')
   */
  utm_medium?: string;

  /**
   * Campaign name (e.g., 'summer_sale', 'product_launch')
   */
  utm_campaign?: string;

  /**
   * Campaign term (e.g., paid keywords)
   */
  utm_term?: string;

  /**
   * Campaign content (e.g., link text, ad variation)
   */
  utm_content?: string;
}

/**
 * Event data structure for analytics events
 */
export interface EventData {
  /**
   * Event name (e.g., 'page_view', 'click', 'custom_event')
   */
  name: string;

  /**
   * Current page URL
   */
  url?: string;

  /**
   * Page referrer
   */
  referrer?: string;

  /**
   * Screen width
   */
  screenWidth?: number;

  /**
   * Screen height
   */
  screenHeight?: number;

  /**
   * User agent string
   */
  userAgent?: string;

  /**
   * Custom event properties (supports nested objects)
   */
  props?: Record<string, any>;

  /**
   * Timestamp when the event occurred
   */
  timestamp?: number;

  /**
   * UTM parameters for campaign attribution
   */
  utmParams?: UTMParams;
}

/**
 * Internal event payload sent to the API
 */
export interface EventPayload {
  /**
   * API key for authentication
   */
  apiKey: string;

  /**
   * Event data
   */
  event: EventData;

  /**
   * Session ID for grouping events
   */
  sessionId?: string;

  /**
   * Client-generated unique ID for the visitor
   */
  visitorId?: string;
}

/**
 * API response structure
 */
export interface ApiResponse {
  /**
   * Whether the request was successful
   */
  success: boolean;

  /**
   * Error message if request failed
   */
  error?: string;

  /**
   * Additional data from the server
   */
  data?: unknown;
}

/**
 * Queue item for offline event storage
 */
export interface QueuedEvent {
  /**
   * Event payload
   */
  payload: EventPayload;

  /**
   * Number of retry attempts
   */
  retries: number;

  /**
   * Timestamp when the event was queued
   */
  queuedAt: number;
}
