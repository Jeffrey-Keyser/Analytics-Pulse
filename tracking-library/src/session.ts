/**
 * Session management for Analytics Pulse tracking library
 *
 * Handles session lifecycle including:
 * - Session ID generation and persistence
 * - Visitor ID generation and persistence
 * - Session timeout with configurable duration
 * - Page Visibility API integration for pause/resume
 * - Activity tracking to reset timeout on user interaction
 */

import { generateUUID } from './utils';

/**
 * Configuration options for SessionManager
 */
export interface SessionManagerConfig {
  /**
   * Session timeout in milliseconds
   * @default 1800000 (30 minutes)
   */
  sessionTimeout?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * SessionManager handles all session-related functionality including
 * ID generation, persistence, and timeout management.
 */
export class SessionManager {
  private static readonly VISITOR_ID_KEY = '_ap_visitor_id';
  private static readonly SESSION_ID_KEY = '_ap_session_id';
  private static readonly SESSION_START_KEY = '_ap_session_start';
  private static readonly LAST_ACTIVITY_KEY = '_ap_last_activity';

  private static readonly DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  private visitorId: string;
  private sessionId: string;
  private sessionStartTime: number;
  private lastActivityTime: number;
  private sessionTimeout: number;
  private timeoutId: number | null = null;
  private isNewSession: boolean = false;
  private isPaused: boolean = false;
  private pausedAt: number | null = null;
  private debug: boolean;

  /**
   * Create a new SessionManager instance
   *
   * @param config - Optional configuration options
   */
  constructor(config: SessionManagerConfig = {}) {
    this.sessionTimeout = config.sessionTimeout || SessionManager.DEFAULT_TIMEOUT;
    this.debug = config.debug || false;

    // Initialize or restore visitor ID (persistent across sessions)
    this.visitorId = this.initializeVisitorId();

    // Initialize or restore session (may create new session if expired)
    const sessionData = this.initializeSession();
    this.sessionId = sessionData.sessionId;
    this.sessionStartTime = sessionData.startTime;
    this.lastActivityTime = sessionData.lastActivity;
    this.isNewSession = sessionData.isNew;

    this.log('SessionManager initialized', {
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      isNewSession: this.isNewSession,
      sessionTimeout: this.sessionTimeout,
    });

    // Set up visibility change handler for pause/resume
    this.setupVisibilityHandler();

    // Set up activity tracking
    this.setupActivityTracking();

    // Start the timeout timer
    this.startTimeoutTimer();
  }

  /**
   * Initialize or retrieve visitor ID from localStorage
   */
  private initializeVisitorId(): string {
    try {
      let visitorId = localStorage.getItem(SessionManager.VISITOR_ID_KEY);

      if (!visitorId) {
        visitorId = generateUUID();
        localStorage.setItem(SessionManager.VISITOR_ID_KEY, visitorId);
        this.log('Created new visitor ID', visitorId);
      } else {
        this.log('Retrieved existing visitor ID', visitorId);
      }

      return visitorId;
    } catch (error) {
      // localStorage might be unavailable (private browsing, etc.)
      this.log('localStorage unavailable, using temporary visitor ID', error, 'warn');
      return generateUUID();
    }
  }

  /**
   * Initialize or restore session from sessionStorage
   * Creates a new session if:
   * - No existing session ID found
   * - Session has expired (exceeded timeout)
   */
  private initializeSession(): {
    sessionId: string;
    startTime: number;
    lastActivity: number;
    isNew: boolean;
  } {
    try {
      const existingSessionId = sessionStorage.getItem(SessionManager.SESSION_ID_KEY);
      const existingStartTime = sessionStorage.getItem(SessionManager.SESSION_START_KEY);
      const existingLastActivity = sessionStorage.getItem(
        SessionManager.LAST_ACTIVITY_KEY
      );

      const now = Date.now();

      // Check if we have a valid existing session
      if (existingSessionId && existingLastActivity) {
        const lastActivity = parseInt(existingLastActivity, 10);
        const timeSinceLastActivity = now - lastActivity;

        // Session is still valid if within timeout period
        if (timeSinceLastActivity < this.sessionTimeout) {
          this.log('Restored existing session', {
            sessionId: existingSessionId,
            timeSinceLastActivity,
          });

          return {
            sessionId: existingSessionId,
            startTime: existingStartTime ? parseInt(existingStartTime, 10) : now,
            lastActivity,
            isNew: false,
          };
        } else {
          this.log('Session expired, creating new session', {
            timeSinceLastActivity,
            timeout: this.sessionTimeout,
          });
        }
      }

      // Create new session
      const sessionId = generateUUID();
      sessionStorage.setItem(SessionManager.SESSION_ID_KEY, sessionId);
      sessionStorage.setItem(SessionManager.SESSION_START_KEY, now.toString());
      sessionStorage.setItem(SessionManager.LAST_ACTIVITY_KEY, now.toString());

      this.log('Created new session', sessionId);

      return {
        sessionId,
        startTime: now,
        lastActivity: now,
        isNew: true,
      };
    } catch (error) {
      // sessionStorage might be unavailable
      this.log('sessionStorage unavailable, using temporary session', error, 'warn');

      const now = Date.now();
      return {
        sessionId: generateUUID(),
        startTime: now,
        lastActivity: now,
        isNew: true,
      };
    }
  }

  /**
   * Set up Page Visibility API handler to pause/resume timeout timer
   */
  private setupVisibilityHandler(): void {
    if (typeof document === 'undefined' || !document.addEventListener) {
      return;
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseTimeout();
      } else {
        this.resumeTimeout();
      }
    });

    this.log('Visibility handler set up');
  }

  /**
   * Set up activity tracking to reset timeout on user interaction
   */
  private setupActivityTracking(): void {
    if (typeof window === 'undefined' || !window.addEventListener) {
      return;
    }

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      this.updateActivity();
    };

    activityEvents.forEach((eventType) => {
      window.addEventListener(eventType, handleActivity, { passive: true });
    });

    this.log('Activity tracking set up');
  }

  /**
   * Update last activity time and reset timeout timer
   */
  private updateActivity(): void {
    const now = Date.now();
    this.lastActivityTime = now;

    try {
      sessionStorage.setItem(SessionManager.LAST_ACTIVITY_KEY, now.toString());
    } catch (error) {
      // Ignore storage errors
    }

    // Reset the timeout timer
    this.startTimeoutTimer();
  }

  /**
   * Start or restart the session timeout timer
   */
  private startTimeoutTimer(): void {
    // Clear existing timer
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    // Don't start timer if paused
    if (this.isPaused) {
      return;
    }

    // Set new timer
    this.timeoutId = window.setTimeout(() => {
      this.handleSessionTimeout();
    }, this.sessionTimeout);

    this.log('Timeout timer started', { timeout: this.sessionTimeout });
  }

  /**
   * Pause the timeout timer when page is hidden
   */
  private pauseTimeout(): void {
    if (this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.pausedAt = Date.now();

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.log('Timeout timer paused');
  }

  /**
   * Resume the timeout timer when page becomes visible
   */
  private resumeTimeout(): void {
    if (!this.isPaused) {
      return;
    }

    this.isPaused = false;

    // Calculate how much time was spent paused
    const now = Date.now();
    const pauseDuration = this.pausedAt ? now - this.pausedAt : 0;
    this.pausedAt = null;

    // Check if session expired while paused
    const timeSinceLastActivity = now - this.lastActivityTime;
    if (timeSinceLastActivity >= this.sessionTimeout) {
      this.log('Session expired while paused');
      this.handleSessionTimeout();
      return;
    }

    this.log('Timeout timer resumed', { pauseDuration });

    // Restart the timer with remaining time
    this.startTimeoutTimer();
  }

  /**
   * Handle session timeout by creating a new session
   */
  private handleSessionTimeout(): void {
    this.log('Session timeout occurred, creating new session');

    // Create new session
    const now = Date.now();
    this.sessionId = generateUUID();
    this.sessionStartTime = now;
    this.lastActivityTime = now;
    this.isNewSession = true;

    try {
      sessionStorage.setItem(SessionManager.SESSION_ID_KEY, this.sessionId);
      sessionStorage.setItem(SessionManager.SESSION_START_KEY, now.toString());
      sessionStorage.setItem(SessionManager.LAST_ACTIVITY_KEY, now.toString());
    } catch (error) {
      // Ignore storage errors
    }

    // Restart timeout timer
    this.startTimeoutTimer();
  }

  /**
   * Get the current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get the current visitor ID
   */
  public getVisitorId(): string {
    return this.visitorId;
  }

  /**
   * Check if this is a new session
   * Returns true only once after session creation, then false
   */
  public getIsNewSession(): boolean {
    const wasNew = this.isNewSession;
    if (wasNew) {
      this.isNewSession = false;
    }
    return wasNew;
  }

  /**
   * Get the session start time
   */
  public getSessionStartTime(): number {
    return this.sessionStartTime;
  }

  /**
   * Get the last activity time
   */
  public getLastActivityTime(): number {
    return this.lastActivityTime;
  }

  /**
   * Get the session timeout duration
   */
  public getSessionTimeout(): number {
    return this.sessionTimeout;
  }

  /**
   * Manually end the current session and start a new one
   */
  public endSession(): void {
    this.log('Manually ending session');
    this.handleSessionTimeout();
  }

  /**
   * Clean up event listeners and timers
   */
  public destroy(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.log('SessionManager destroyed');
  }

  /**
   * Log debug messages
   */
  private log(message: string, data?: any, level: 'log' | 'warn' | 'error' = 'log'): void {
    if (this.debug) {
      const prefix = '[SessionManager]';
      if (data !== undefined) {
        console[level](prefix, message, data);
      } else {
        console[level](prefix, message);
      }
    }
  }
}
