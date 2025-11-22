import { Request, Response } from 'express';
import eventsDal, { EventsDal, CreateEventParams, UTMParams } from '../dal/events';
import sessionsDal, { SessionsDal } from '../dal/sessions';
import userAgentService, { UserAgentService } from '../services/userAgent';
import geolocationService, { GeolocationService } from '../services/geolocation';
import sessionsService, { SessionsService, SessionMetadata } from '../services/sessions';
import goalTrackingService, { GoalTrackingService } from '../services/goalTracking';

export interface TrackEventRequest {
  event_type: string;
  event_name?: string;
  session_id: string;
  url: string;
  referrer?: string;
  user_agent?: string;
  screen_width?: number;
  screen_height?: number;
  viewport_width?: number;
  viewport_height?: number;
  language?: string;
  timezone?: string;
  custom_data?: Record<string, any>;
  utm_params?: UTMParams;
}

export interface TrackEventResponse {
  ok: boolean;
}

export class TrackingController {
  private eventsDal: EventsDal;
  private sessionsDal: SessionsDal;
  private userAgentService: UserAgentService;
  private geolocationService: GeolocationService;
  private sessionsService: SessionsService;
  private goalTrackingService: GoalTrackingService;

  constructor(
    eventsDalInstance: EventsDal = eventsDal,
    sessionsDalInstance: SessionsDal = sessionsDal,
    userAgentServiceInstance: UserAgentService = userAgentService,
    geolocationServiceInstance: GeolocationService = geolocationService,
    sessionsServiceInstance: SessionsService = sessionsService,
    goalTrackingServiceInstance: GoalTrackingService = goalTrackingService
  ) {
    this.eventsDal = eventsDalInstance;
    this.sessionsDal = sessionsDalInstance;
    this.userAgentService = userAgentServiceInstance;
    this.geolocationService = geolocationServiceInstance;
    this.sessionsService = sessionsServiceInstance;
    this.goalTrackingService = goalTrackingServiceInstance;
  }

  /**
   * Track an event - main endpoint handler
   *
   * POST /api/v1/track/event
   */
  async trackEvent(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();

      // Get project ID from API key auth middleware
      const projectId = req.apiKeyProjectId;
      if (!projectId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'API key authentication required'
        });
        return;
      }

      // Validate required fields
      const {
        event_type,
        event_name,
        session_id,
        url,
        referrer,
        user_agent,
        screen_width,
        screen_height,
        viewport_width,
        viewport_height,
        language,
        timezone,
        custom_data,
        utm_params
      } = req.body as TrackEventRequest;

      if (!event_type || !session_id || !url) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Missing required fields: event_type, session_id, url'
        });
        return;
      }

      // Get IP address from request (considering proxies)
      const ipAddress = this.getClientIp(req);

      // Parse user agent
      const userAgentString = user_agent || req.headers['user-agent'] || '';
      const parsedUserAgent = this.userAgentService.parseUserAgent(userAgentString);

      // Get geolocation from IP
      const geolocation = this.geolocationService.lookupCountryWithPrivacyCheck(ipAddress);

      // Check if this is the first event for this session
      const existingSession = await this.sessionsDal.findBySessionId(session_id);
      const isNewSession = !existingSession;
      const isPageview = event_type === 'pageview';

      // Create event record
      const eventParams: CreateEventParams = {
        project_id: projectId,
        session_id,
        event_type,
        event_name,
        url,
        referrer: referrer || undefined,
        user_agent: userAgentString || undefined,
        ip_hash: geolocation.ipHash || '',
        country: geolocation.country || undefined,
        browser: parsedUserAgent.browser.name || undefined,
        os: parsedUserAgent.os.name || undefined,
        device_type: parsedUserAgent.device.type || undefined,
        screen_width: screen_width || undefined,
        screen_height: screen_height || undefined,
        viewport_width: viewport_width || undefined,
        viewport_height: viewport_height || undefined,
        language: language || undefined,
        timezone: timezone || undefined,
        custom_data: custom_data || undefined,
        utm_params: utm_params || undefined,
        timestamp: new Date()
      };

      // Insert event asynchronously (fire and forget for performance)
      this.eventsDal.create(eventParams).catch(err => {
        console.error('Failed to insert event:', err);
      });

      // Check for goal completions asynchronously (fire and forget)
      this.goalTrackingService.checkAndRecordGoalCompletions(eventParams).catch(err => {
        console.error('Failed to check goal completions:', err);
      });

      // Upsert session record using SessionsService
      const sessionMetadata: SessionMetadata = {
        projectId,
        sessionId: session_id,
        url,
        referrer,
        userAgent: userAgentString,
        ipHash: geolocation.ipHash || '',
        country: geolocation.country,
        browser: parsedUserAgent.browser.name,
        os: parsedUserAgent.os.name,
        deviceType: parsedUserAgent.device.type,
        screenWidth: screen_width,
        screenHeight: screen_height,
        language,
        timezone,
        isPageview,
        timestamp: new Date()
      };

      this.sessionsService.upsertSession(sessionMetadata, isNewSession);

      // Return minimal response for performance (< 50ms target)
      const duration = Date.now() - startTime;

      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Event tracked in ${duration}ms`);
      }

      const response: TrackEventResponse = { ok: true };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error tracking event:', error);

      // Return simple error response
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to track event'
      });
    }
  }

  /**
   * Track multiple events in a batch
   *
   * POST /api/v1/track/batch
   */
  async trackBatch(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();

      // Get project ID from API key auth middleware
      const projectId = req.apiKeyProjectId;
      if (!projectId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'API key authentication required'
        });
        return;
      }

      // Validate batch array
      const { events } = req.body;
      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'events must be a non-empty array'
        });
        return;
      }

      // Limit batch size to prevent abuse
      const MAX_BATCH_SIZE = 100;
      if (events.length > MAX_BATCH_SIZE) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} events`
        });
        return;
      }

      // Get IP address once for all events
      const ipAddress = this.getClientIp(req);
      const geolocation = this.geolocationService.lookupCountryWithPrivacyCheck(ipAddress);

      // Process each event
      const eventParams: CreateEventParams[] = [];

      for (const event of events as TrackEventRequest[]) {
        // Validate required fields
        if (!event.event_type || !event.session_id || !event.url) {
          continue; // Skip invalid events
        }

        // Parse user agent
        const userAgentString = event.user_agent || req.headers['user-agent'] || '';
        const parsedUserAgent = this.userAgentService.parseUserAgent(userAgentString);

        eventParams.push({
          project_id: projectId,
          session_id: event.session_id,
          event_type: event.event_type,
          event_name: event.event_name,
          url: event.url,
          referrer: event.referrer,
          user_agent: userAgentString,
          ip_hash: geolocation.ipHash || '',
          country: geolocation.country,
          browser: parsedUserAgent.browser.name,
          os: parsedUserAgent.os.name,
          device_type: parsedUserAgent.device.type,
          screen_width: event.screen_width,
          screen_height: event.screen_height,
          viewport_width: event.viewport_width,
          viewport_height: event.viewport_height,
          language: event.language,
          timezone: event.timezone,
          custom_data: event.custom_data,
          utm_params: event.utm_params,
          timestamp: new Date()
        });
      }

      // Batch insert events
      if (eventParams.length > 0) {
        this.eventsDal.createBatch(eventParams).catch(err => {
          console.error('Failed to batch insert events:', err);
        });

        // Check for goal completions in batch (fire and forget)
        this.goalTrackingService.batchCheckGoalCompletions(eventParams).catch(err => {
          console.error('Failed to batch check goal completions:', err);
        });
      }

      // Return response
      const duration = Date.now() - startTime;

      if (process.env.NODE_ENV === 'development') {
        console.log(`Batch tracked ${eventParams.length} events in ${duration}ms`);
      }

      res.status(200).json({
        ok: true,
        processed: eventParams.length,
        skipped: events.length - eventParams.length
      });
    } catch (error) {
      console.error('Error tracking batch:', error);

      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to track batch'
      });
    }
  }

  /**
   * Get client IP address, considering proxy headers
   */
  private getClientIp(req: Request): string {
    // Check for common proxy headers
    const xForwardedFor = req.headers['x-forwarded-for'];
    const xRealIp = req.headers['x-real-ip'];
    const cfConnectingIp = req.headers['cf-connecting-ip']; // Cloudflare

    if (typeof cfConnectingIp === 'string') {
      return cfConnectingIp;
    }

    if (typeof xRealIp === 'string') {
      return xRealIp;
    }

    if (typeof xForwardedFor === 'string') {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = xForwardedFor.split(',');
      return ips[0].trim();
    }

    // Fallback to req.ip or req.connection.remoteAddress
    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  }
}

export default new TrackingController();
