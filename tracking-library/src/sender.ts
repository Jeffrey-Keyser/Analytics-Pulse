/**
 * HTTP Sender for Analytics Pulse tracking library
 * Handles sending events to the ingestion API with retry logic and error handling
 */

import { EventPayload } from './types';

/**
 * Configuration options for the Sender
 */
export interface SenderConfig {
  /**
   * Base API endpoint URL
   */
  endpoint: string;

  /**
   * API key for authentication
   */
  apiKey: string;

  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds before first retry
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Request timeout in milliseconds
   * @default 10000
   */
  timeout?: number;
}

/**
 * Response from the sender
 */
export interface SenderResponse {
  /**
   * Whether the request was successful
   */
  success: boolean;

  /**
   * HTTP status code
   */
  status?: number;

  /**
   * Error message if request failed
   */
  error?: string;

  /**
   * Number of retry attempts made
   */
  retries: number;

  /**
   * Response data from the server
   */
  data?: any;
}

/**
 * Error types for sender operations
 */
export enum SenderErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Sender class for making HTTP requests to the Analytics Pulse API
 * with automatic retry logic and exponential backoff
 */
export class Sender {
  private config: Required<SenderConfig>;
  private useXHR: boolean;

  /**
   * Create a new Sender instance
   *
   * @param config - Sender configuration
   */
  constructor(config: SenderConfig) {
    this.config = {
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      debug: config.debug ?? false,
      timeout: config.timeout ?? 10000,
    };

    // Detect if fetch is available, otherwise fall back to XMLHttpRequest
    this.useXHR = typeof fetch === 'undefined';

    if (this.useXHR) {
      this.log('fetch API not available, using XMLHttpRequest fallback');
    }
  }

  /**
   * Send one or more events to the API
   *
   * @param events - Single event or array of events to send
   * @param useKeepAlive - Use keepalive flag for sendBeacon compatibility
   * @returns Promise with sender response
   */
  public async send(
    events: EventPayload | EventPayload[],
    useKeepAlive = false
  ): Promise<SenderResponse> {
    return this.sendWithRetry(events, 0, useKeepAlive);
  }

  /**
   * Send events with automatic retry logic
   *
   * @param events - Single event or array of events to send
   * @param attempt - Current attempt number (0-indexed)
   * @param useKeepAlive - Use keepalive flag
   * @returns Promise with sender response
   */
  private async sendWithRetry(
    events: EventPayload | EventPayload[],
    attempt: number,
    useKeepAlive: boolean
  ): Promise<SenderResponse> {
    const isBatch = Array.isArray(events);
    const endpoint = this.getEndpoint(isBatch);
    const eventCount = isBatch ? events.length : 1;

    this.log(`Sending ${eventCount} event(s) to ${endpoint} (attempt ${attempt + 1})`);

    try {
      const response = this.useXHR
        ? await this.sendWithXHR(endpoint, events, useKeepAlive)
        : await this.sendWithFetch(endpoint, events, useKeepAlive);

      // Success - return response
      if (response.success) {
        this.log(`Successfully sent ${eventCount} event(s)`);
        return {
          ...response,
          retries: attempt,
        };
      }

      // Client error (4xx) - don't retry
      if (response.status && response.status >= 400 && response.status < 500) {
        this.log(
          `Client error ${response.status}, not retrying: ${response.error}`,
          'error'
        );
        return {
          ...response,
          retries: attempt,
        };
      }

      // Server error (5xx) or other error - retry if attempts remain
      if (attempt < this.config.maxRetries) {
        const delay = this.calculateBackoffDelay(attempt);
        this.log(
          `Request failed with status ${response.status}, retrying in ${delay}ms`,
          'warn'
        );
        await this.delay(delay);
        return this.sendWithRetry(events, attempt + 1, useKeepAlive);
      }

      // Max retries reached
      this.log(`Max retries (${this.config.maxRetries}) reached, giving up`, 'error');
      return {
        ...response,
        retries: attempt,
      };
    } catch (error) {
      // Network error or other exception - retry if attempts remain
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Request failed: ${errorMessage}`, 'error');

      if (attempt < this.config.maxRetries) {
        const delay = this.calculateBackoffDelay(attempt);
        this.log(`Retrying in ${delay}ms (attempt ${attempt + 2})`, 'warn');
        await this.delay(delay);
        return this.sendWithRetry(events, attempt + 1, useKeepAlive);
      }

      // Max retries reached
      this.log(`Max retries (${this.config.maxRetries}) reached, giving up`, 'error');
      return {
        success: false,
        error: errorMessage,
        retries: attempt,
      };
    }
  }

  /**
   * Send request using fetch API
   */
  private async sendWithFetch(
    endpoint: string,
    events: EventPayload | EventPayload[],
    useKeepAlive: boolean
  ): Promise<SenderResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(events),
        keepalive: useKeepAlive,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response body
      let data: any;
      try {
        data = await response.json();
      } catch {
        // Response might not be JSON
        data = null;
      }

      if (response.ok) {
        return {
          success: true,
          status: response.status,
          data,
          retries: 0,
        };
      }

      return {
        success: false,
        status: response.status,
        error: data?.error || response.statusText,
        data,
        retries: 0,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Send request using XMLHttpRequest (fallback for older browsers)
   */
  private async sendWithXHR(
    endpoint: string,
    events: EventPayload | EventPayload[],
    useKeepAlive: boolean
  ): Promise<SenderResponse> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      // Set timeout
      xhr.timeout = this.config.timeout;

      xhr.onload = () => {
        let data: any;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = null;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            success: true,
            status: xhr.status,
            data,
            retries: 0,
          });
        } else {
          resolve({
            success: false,
            status: xhr.status,
            error: data?.error || xhr.statusText,
            data,
            retries: 0,
          });
        }
      };

      xhr.onerror = () => {
        resolve({
          success: false,
          error: 'Network error',
          retries: 0,
        });
      };

      xhr.ontimeout = () => {
        resolve({
          success: false,
          error: `Request timeout after ${this.config.timeout}ms`,
          retries: 0,
        });
      };

      xhr.open('POST', endpoint);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${this.config.apiKey}`);

      // Note: keepalive is not supported in XHR, it's a fetch-only feature
      if (useKeepAlive) {
        this.log('keepalive flag is not supported in XMLHttpRequest', 'warn');
      }

      xhr.send(JSON.stringify(events));
    });
  }

  /**
   * Get the appropriate endpoint based on whether sending single or batch events
   */
  private getEndpoint(isBatch: boolean): string {
    const baseUrl = this.config.endpoint.replace(/\/$/, ''); // Remove trailing slash
    return isBatch ? `${baseUrl}/api/v1/track/batch` : `${baseUrl}/api/v1/track/event`;
  }

  /**
   * Calculate exponential backoff delay
   * Returns: 1000ms, 2000ms, 4000ms for attempts 0, 1, 2
   */
  private calculateBackoffDelay(attempt: number): number {
    return this.config.retryDelay * Math.pow(2, attempt);
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log debug messages
   */
  private log(message: string, level: 'log' | 'warn' | 'error' = 'log'): void {
    if (this.config.debug) {
      const prefix = '[AnalyticsPulse:Sender]';
      console[level](`${prefix} ${message}`);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): Readonly<Required<SenderConfig>> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<SenderConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
}
