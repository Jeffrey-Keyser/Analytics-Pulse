/**
 * Event Queue System for batching and offline support
 */

import { EventPayload } from './types';

/**
 * Configuration options for the EventQueue
 */
export interface EventQueueConfig {
  /**
   * Maximum number of events to batch before flushing
   * @default 10
   */
  batchSize?: number;

  /**
   * Time interval in milliseconds to flush the queue
   * @default 5000 (5 seconds)
   */
  flushInterval?: number;

  /**
   * Maximum number of events to store in the queue
   * @default 100
   */
  maxQueueSize?: number;

  /**
   * localStorage key for persisting the queue
   * @default 'analytics_pulse_queue'
   */
  storageKey?: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_QUEUE_CONFIG: Required<EventQueueConfig> = {
  batchSize: 10,
  flushInterval: 5000,
  maxQueueSize: 100,
  storageKey: 'analytics_pulse_queue',
  debug: false,
};

/**
 * EventQueue class for batching events and handling offline scenarios
 *
 * Features:
 * - Automatic batching for efficient network usage
 * - Timer-based flushing
 * - Page unload handling with sendBeacon
 * - localStorage persistence
 * - Offline mode support
 * - Network reconnection handling
 *
 * @example
 * ```typescript
 * const queue = new EventQueue({
 *   batchSize: 10,
 *   flushInterval: 5000
 * }, sendFunction);
 *
 * queue.add(eventPayload);
 * queue.flush(); // Manual flush
 * ```
 */
export class EventQueue {
  private config: Required<EventQueueConfig>;
  private queue: EventPayload[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private sendFunction: (events: EventPayload[]) => Promise<void>;
  private isOnline: boolean = true;
  private isFlushing: boolean = false;

  /**
   * Create a new EventQueue instance
   *
   * @param config - Queue configuration options
   * @param sendFunction - Function to send batched events to the API
   */
  constructor(
    config: EventQueueConfig,
    sendFunction: (events: EventPayload[]) => Promise<void>
  ) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
    this.sendFunction = sendFunction;

    // Check initial online status
    if (typeof navigator !== 'undefined' && typeof navigator.onLine !== 'undefined') {
      this.isOnline = navigator.onLine;
    }

    // Restore queue from localStorage
    this.restoreQueue();

    // Set up event listeners
    this.setupEventListeners();

    // Start the flush timer
    this.startFlushTimer();

    this.log(
      'EventQueue initialized',
      'log',
      {
        config: this.config,
        queueSize: this.queue.length,
        isOnline: this.isOnline,
      }
    );
  }

  /**
   * Add an event to the queue
   *
   * @param event - Event payload to queue
   */
  public add(event: EventPayload): void {
    // Check if queue is at max capacity
    if (this.queue.length >= this.config.maxQueueSize) {
      this.log('Queue is at max capacity, removing oldest event', 'warn');
      this.queue.shift(); // Remove oldest event
    }

    this.queue.push(event);
    this.log('Event added to queue', 'log', { queueSize: this.queue.length });

    // Persist queue to localStorage
    this.persistQueue();

    // Flush if batch size is reached and we're online
    if (this.queue.length >= this.config.batchSize && this.isOnline) {
      this.log('Batch size reached, flushing queue');
      this.flush();
    }
  }

  /**
   * Manually flush the queue
   *
   * @returns Promise that resolves when flush is complete
   */
  public async flush(): Promise<void> {
    // Don't flush if already flushing or queue is empty
    if (this.isFlushing || this.queue.length === 0) {
      return;
    }

    // Don't flush if offline (events will be sent when back online)
    if (!this.isOnline) {
      this.log('Offline, skipping flush');
      return;
    }

    this.isFlushing = true;
    const eventsToSend = [...this.queue];

    this.log('Flushing queue', 'log', { eventCount: eventsToSend.length });

    try {
      await this.sendFunction(eventsToSend);

      // Clear the queue on successful send
      this.queue = [];
      this.persistQueue();

      this.log('Queue flushed successfully');
    } catch (error) {
      this.log('Failed to flush queue', 'error', error);
      // Keep events in queue for retry
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Get the current queue size
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * Check if the queue is empty
   */
  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Clear the queue and localStorage
   */
  public clear(): void {
    this.queue = [];
    this.persistQueue();
    this.log('Queue cleared');
  }

  /**
   * Destroy the queue and clean up resources
   */
  public destroy(): void {
    // Stop the flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Remove event listeners
    this.removeEventListeners();

    this.log('EventQueue destroyed');
  }

  /**
   * Set up browser event listeners
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Listen for page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload);

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  /**
   * Remove browser event listeners
   */
  private removeEventListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  /**
   * Handle page unload event
   * Uses sendBeacon API for reliable delivery
   */
  private handleBeforeUnload = (): void => {
    this.log('Page unloading, persisting queue and sending with sendBeacon');

    // Persist queue to localStorage
    this.persistQueue();

    // Try to send remaining events using sendBeacon if available
    if (this.queue.length > 0 && this.isOnline) {
      this.sendWithBeacon();
    }
  };

  /**
   * Handle online event (network reconnection)
   */
  private handleOnline = (): void => {
    this.log('Network connection restored');
    this.isOnline = true;

    // Flush queued events when back online
    if (this.queue.length > 0) {
      this.log('Flushing queued events after reconnection');
      this.flush();
    }
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    this.log('Network connection lost');
    this.isOnline = false;
  };

  /**
   * Send events using the sendBeacon API
   * This is more reliable during page unload
   */
  private sendWithBeacon(): void {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
      this.log('sendBeacon not available', 'warn');
      return;
    }

    // Note: We need the endpoint URL to use sendBeacon
    // This will be provided by the AnalyticsPulse class
    // For now, we just log that we would use it
    this.log('Would use sendBeacon to send events', 'log', { eventCount: this.queue.length });
  }

  /**
   * Start the automatic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      if (this.queue.length > 0) {
        this.log('Flush timer triggered');
        this.flush();
      }
      this.startFlushTimer(); // Restart the timer
    }, this.config.flushInterval);
  }

  /**
   * Persist the queue to localStorage
   */
  private persistQueue(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = JSON.stringify(this.queue);
      localStorage.setItem(this.config.storageKey, data);
      this.log('Queue persisted to localStorage');
    } catch (error) {
      this.log('Failed to persist queue to localStorage', 'error', error);
    }
  }

  /**
   * Restore the queue from localStorage
   */
  private restoreQueue(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = localStorage.getItem(this.config.storageKey);

      if (data) {
        const parsed = JSON.parse(data);

        if (Array.isArray(parsed)) {
          // Limit to max queue size when restoring
          this.queue = parsed.slice(-this.config.maxQueueSize);
          this.log('Queue restored from localStorage', 'log', { eventCount: this.queue.length });
        }
      }
    } catch (error) {
      this.log('Failed to restore queue from localStorage', 'error', error);
      // Clear corrupted data
      try {
        localStorage.removeItem(this.config.storageKey);
      } catch (_e) {
        // Ignore errors when trying to clear
      }
    }
  }

  /**
   * Log debug messages
   */
  private log(
    message: string,
    level: 'log' | 'warn' | 'error' = 'log',
    data?: any
  ): void {
    if (this.config.debug) {
      const prefix = '[EventQueue]';
      if (data !== undefined) {
        console[level](prefix, message, data);
      } else {
        console[level](prefix, message);
      }
    }
  }
}
