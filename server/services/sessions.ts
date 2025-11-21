import sessionsDal, { SessionsDal, CreateSessionParams, UpdateSessionParams } from '../dal/sessions';

export interface SessionMetadata {
  projectId: string;
  sessionId: string;
  url: string;
  referrer?: string;
  userAgent?: string;
  ipHash: string;
  country?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  timezone?: string;
  isPageview: boolean;
  timestamp: Date;
}

export class SessionsService {
  private dal: SessionsDal;

  constructor(dal: SessionsDal = sessionsDal) {
    this.dal = dal;
  }

  /**
   * Upsert a session record - creates new session on first event, updates on subsequent events
   *
   * This method handles the complete session lifecycle:
   * - On first event: Creates session with all metadata (browser, OS, device, referrer, landing page, etc.)
   * - On subsequent events: Updates exit page, increments pageview/event counters, updates ended_at timestamp
   *
   * @param metadata - Session metadata from the tracking event
   * @param isNewSession - Whether this is the first event for this session
   */
  async upsertSession(metadata: SessionMetadata, isNewSession: boolean): Promise<void> {
    const {
      projectId,
      sessionId,
      url,
      referrer,
      userAgent,
      ipHash,
      country,
      browser,
      os,
      deviceType,
      screenWidth,
      screenHeight,
      language,
      timezone,
      isPageview,
      timestamp
    } = metadata;

    if (isNewSession) {
      // Create new session with all metadata
      const createParams: CreateSessionParams = {
        project_id: projectId,
        session_id: sessionId,
        ip_hash: ipHash,
        user_agent: userAgent,
        country,
        browser,
        os,
        device_type: deviceType,
        referrer,
        landing_page: url,
        screen_width: screenWidth,
        screen_height: screenHeight,
        language,
        timezone,
        started_at: timestamp
      };

      // Fire and forget for performance
      this.dal.create(createParams).catch(err => {
        console.error('Failed to create session:', err);
      });
    } else {
      // Update existing session
      // Note: We need to fetch the existing session to get current counters
      const existingSession = await this.dal.findBySessionId(sessionId);

      if (!existingSession) {
        console.error(`Session not found for update: ${sessionId}`);
        return;
      }

      const updateParams: UpdateSessionParams = {
        exit_page: url,
        pageviews: existingSession.pageviews + (isPageview ? 1 : 0),
        events_count: existingSession.events_count + 1,
        ended_at: timestamp,
        is_bounce: false // More than one event = not a bounce
      };

      // Fire and forget for performance
      this.dal.update(sessionId, updateParams).catch(err => {
        console.error('Failed to update session:', err);
      });
    }
  }

  /**
   * Check if a session exists
   *
   * @param sessionId - The session ID to check
   * @returns True if the session exists, false otherwise
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    const session = await this.dal.findBySessionId(sessionId);
    return session !== null;
  }

  /**
   * Use the DAL's efficient upsert method for atomic session creation/update
   * This method is more efficient than the separate create/update approach
   * as it handles everything in a single database query.
   *
   * @param metadata - Session metadata from the tracking event
   */
  async upsertSessionAtomic(metadata: SessionMetadata): Promise<void> {
    const {
      projectId,
      sessionId,
      url,
      referrer,
      userAgent,
      ipHash,
      country,
      browser,
      os,
      deviceType,
      screenWidth,
      screenHeight,
      language,
      timezone,
      isPageview,
      timestamp
    } = metadata;

    // Create params for new session
    const createParams: CreateSessionParams = {
      project_id: projectId,
      session_id: sessionId,
      ip_hash: ipHash,
      user_agent: userAgent,
      country,
      browser,
      os,
      device_type: deviceType,
      referrer,
      landing_page: url,
      screen_width: screenWidth,
      screen_height: screenHeight,
      language,
      timezone,
      started_at: timestamp
    };

    // Update params for existing session
    // Note: The upsert method in the DAL uses COALESCE, so we need to handle counters differently
    // For now, we'll use the non-atomic approach in upsertSession() for counter increments
    // This method is provided for future optimization when we add counter increment support to the DAL
    const updateParams: UpdateSessionParams = {
      exit_page: url,
      ended_at: timestamp,
      is_bounce: false
    };

    // Fire and forget for performance
    this.dal.upsert(createParams, updateParams).catch(err => {
      console.error('Failed to upsert session:', err);
    });
  }
}

export default new SessionsService();
