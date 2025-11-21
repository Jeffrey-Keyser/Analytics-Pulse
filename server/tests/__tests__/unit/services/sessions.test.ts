// Mock the DAL
jest.mock('../../../../dal/sessions');

import { SessionsService, SessionMetadata } from '../../../../services/sessions';
import { SessionsDal, Session } from '../../../../dal/sessions';

describe('SessionsService', () => {
  let service: SessionsService;
  let mockDal: jest.Mocked<SessionsDal>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock DAL
    mockDal = {
      create: jest.fn(),
      findBySessionId: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      incrementCounters: jest.fn(),
      findByProjectId: jest.fn(),
      countByProjectId: jest.fn(),
      getBounceRate: jest.fn(),
    } as any;

    // Create service with mock DAL
    service = new SessionsService(mockDal);
  });

  // Helper to create session metadata
  const createSessionMetadata = (overrides?: Partial<SessionMetadata>): SessionMetadata => ({
    projectId: 'test-project-id',
    sessionId: 'test-session-id',
    url: 'https://example.com/page',
    referrer: 'https://google.com',
    userAgent: 'Mozilla/5.0',
    ipHash: 'hashed-ip-address',
    country: 'US',
    browser: 'Chrome',
    os: 'Windows',
    deviceType: 'desktop',
    screenWidth: 1920,
    screenHeight: 1080,
    language: 'en-US',
    timezone: 'America/New_York',
    isPageview: true,
    timestamp: new Date('2025-01-15T10:00:00Z'),
    ...overrides
  });

  // Helper to create existing session
  const createExistingSession = (overrides?: Partial<Session>): Session => ({
    id: 'session-db-id',
    project_id: 'test-project-id',
    session_id: 'test-session-id',
    ip_hash: 'hashed-ip-address',
    user_agent: 'Mozilla/5.0',
    country: 'US',
    city: null,
    browser: 'Chrome',
    os: 'Windows',
    device_type: 'desktop',
    referrer: 'https://google.com',
    landing_page: 'https://example.com/home',
    exit_page: 'https://example.com/about',
    screen_width: 1920,
    screen_height: 1080,
    language: 'en-US',
    timezone: 'America/New_York',
    pageviews: 3,
    events_count: 5,
    duration_seconds: null,
    started_at: new Date('2025-01-15T10:00:00Z'),
    ended_at: new Date('2025-01-15T10:05:00Z'),
    is_bounce: false,
    created_at: new Date('2025-01-15T10:00:00Z'),
    updated_at: new Date('2025-01-15T10:05:00Z'),
    ...overrides
  });

  describe('upsertSession', () => {
    describe('new session (isNewSession = true)', () => {
      it('should create a new session with all metadata', async () => {
        const metadata = createSessionMetadata();
        mockDal.create.mockResolvedValue(createExistingSession());

        await service.upsertSession(metadata, true);

        // Wait for async operation
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockDal.create).toHaveBeenCalledWith({
          project_id: 'test-project-id',
          session_id: 'test-session-id',
          ip_hash: 'hashed-ip-address',
          user_agent: 'Mozilla/5.0',
          country: 'US',
          browser: 'Chrome',
          os: 'Windows',
          device_type: 'desktop',
          referrer: 'https://google.com',
          landing_page: 'https://example.com/page',
          screen_width: 1920,
          screen_height: 1080,
          language: 'en-US',
          timezone: 'America/New_York',
          started_at: metadata.timestamp
        });
        expect(mockDal.update).not.toHaveBeenCalled();
      });

      it('should handle optional fields as undefined', async () => {
        const metadata = createSessionMetadata({
          referrer: undefined,
          country: undefined,
          browser: undefined,
          os: undefined,
          deviceType: undefined,
          screenWidth: undefined,
          screenHeight: undefined,
          language: undefined,
          timezone: undefined
        });
        mockDal.create.mockResolvedValue(createExistingSession());

        await service.upsertSession(metadata, true);

        // Wait for async operation
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockDal.create).toHaveBeenCalledWith({
          project_id: 'test-project-id',
          session_id: 'test-session-id',
          ip_hash: 'hashed-ip-address',
          user_agent: 'Mozilla/5.0',
          country: undefined,
          browser: undefined,
          os: undefined,
          device_type: undefined,
          referrer: undefined,
          landing_page: 'https://example.com/page',
          screen_width: undefined,
          screen_height: undefined,
          language: undefined,
          timezone: undefined,
          started_at: metadata.timestamp
        });
      });

      it('should handle DAL create errors gracefully (fire and forget)', async () => {
        const metadata = createSessionMetadata();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        mockDal.create.mockRejectedValue(new Error('Database error'));

        await service.upsertSession(metadata, true);

        // Wait for async operation
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockDal.create).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to create session:',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });
    });

    describe('existing session (isNewSession = false)', () => {
      it('should update existing session and increment counters for pageview', async () => {
        const metadata = createSessionMetadata({ isPageview: true });
        const existingSession = createExistingSession({
          pageviews: 2,
          events_count: 4
        });

        mockDal.findBySessionId.mockResolvedValue(existingSession);
        mockDal.update.mockResolvedValue(createExistingSession({
          pageviews: 3,
          events_count: 5
        }));

        await service.upsertSession(metadata, false);

        expect(mockDal.findBySessionId).toHaveBeenCalledWith('test-session-id');
        expect(mockDal.update).toHaveBeenCalledWith('test-session-id', {
          exit_page: 'https://example.com/page',
          pageviews: 3, // 2 + 1
          events_count: 5, // 4 + 1
          ended_at: metadata.timestamp,
          is_bounce: false
        });
        expect(mockDal.create).not.toHaveBeenCalled();
      });

      it('should update existing session and increment counters for non-pageview event', async () => {
        const metadata = createSessionMetadata({ isPageview: false });
        const existingSession = createExistingSession({
          pageviews: 2,
          events_count: 4
        });

        mockDal.findBySessionId.mockResolvedValue(existingSession);
        mockDal.update.mockResolvedValue(createExistingSession({
          pageviews: 2,
          events_count: 5
        }));

        await service.upsertSession(metadata, false);

        expect(mockDal.findBySessionId).toHaveBeenCalledWith('test-session-id');
        expect(mockDal.update).toHaveBeenCalledWith('test-session-id', {
          exit_page: 'https://example.com/page',
          pageviews: 2, // 2 + 0 (not a pageview)
          events_count: 5, // 4 + 1
          ended_at: metadata.timestamp,
          is_bounce: false
        });
      });

      it('should set is_bounce to false on second event', async () => {
        const metadata = createSessionMetadata();
        const existingSession = createExistingSession({
          pageviews: 0,
          events_count: 1,
          is_bounce: true
        });

        mockDal.findBySessionId.mockResolvedValue(existingSession);
        mockDal.update.mockResolvedValue(createExistingSession({
          is_bounce: false
        }));

        await service.upsertSession(metadata, false);

        expect(mockDal.update).toHaveBeenCalledWith('test-session-id', {
          exit_page: 'https://example.com/page',
          pageviews: 1,
          events_count: 2,
          ended_at: metadata.timestamp,
          is_bounce: false
        });
      });

      it('should handle session not found gracefully', async () => {
        const metadata = createSessionMetadata();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockDal.findBySessionId.mockResolvedValue(null);

        await service.upsertSession(metadata, false);

        expect(mockDal.findBySessionId).toHaveBeenCalledWith('test-session-id');
        expect(mockDal.update).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Session not found for update: test-session-id'
        );

        consoleErrorSpy.mockRestore();
      });

      it('should handle DAL update errors gracefully (fire and forget)', async () => {
        const metadata = createSessionMetadata();
        const existingSession = createExistingSession();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockDal.findBySessionId.mockResolvedValue(existingSession);
        mockDal.update.mockRejectedValue(new Error('Database error'));

        await service.upsertSession(metadata, false);

        // Wait for async operation
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockDal.update).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to update session:',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('sessionExists', () => {
    it('should return true if session exists', async () => {
      const existingSession = createExistingSession();
      mockDal.findBySessionId.mockResolvedValue(existingSession);

      const result = await service.sessionExists('test-session-id');

      expect(result).toBe(true);
      expect(mockDal.findBySessionId).toHaveBeenCalledWith('test-session-id');
    });

    it('should return false if session does not exist', async () => {
      mockDal.findBySessionId.mockResolvedValue(null);

      const result = await service.sessionExists('nonexistent-session-id');

      expect(result).toBe(false);
      expect(mockDal.findBySessionId).toHaveBeenCalledWith('nonexistent-session-id');
    });
  });

  describe('upsertSessionAtomic', () => {
    it('should call DAL upsert with correct create and update params', async () => {
      const metadata = createSessionMetadata();
      mockDal.upsert.mockResolvedValue(createExistingSession());

      await service.upsertSessionAtomic(metadata);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDal.upsert).toHaveBeenCalledWith(
        // Create params
        {
          project_id: 'test-project-id',
          session_id: 'test-session-id',
          ip_hash: 'hashed-ip-address',
          user_agent: 'Mozilla/5.0',
          country: 'US',
          browser: 'Chrome',
          os: 'Windows',
          device_type: 'desktop',
          referrer: 'https://google.com',
          landing_page: 'https://example.com/page',
          screen_width: 1920,
          screen_height: 1080,
          language: 'en-US',
          timezone: 'America/New_York',
          started_at: metadata.timestamp
        },
        // Update params
        {
          exit_page: 'https://example.com/page',
          ended_at: metadata.timestamp,
          is_bounce: false
        }
      );
    });

    it('should handle DAL upsert errors gracefully', async () => {
      const metadata = createSessionMetadata();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDal.upsert.mockRejectedValue(new Error('Database error'));

      await service.upsertSessionAtomic(metadata);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDal.upsert).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to upsert session:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle optional fields as undefined', async () => {
      const metadata = createSessionMetadata({
        referrer: undefined,
        country: undefined,
        browser: undefined,
        os: undefined,
        deviceType: undefined
      });
      mockDal.upsert.mockResolvedValue(createExistingSession());

      await service.upsertSessionAtomic(metadata);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDal.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          country: undefined,
          browser: undefined,
          os: undefined,
          device_type: undefined,
          referrer: undefined
        }),
        expect.any(Object)
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings in metadata', async () => {
      const metadata = createSessionMetadata({
        userAgent: '',
        referrer: '',
        country: '',
        browser: '',
        os: ''
      });
      mockDal.create.mockResolvedValue(createExistingSession());

      await service.upsertSession(metadata, true);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_agent: '',
          referrer: '',
          country: '',
          browser: '',
          os: ''
        })
      );
    });

    it('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      const metadata = createSessionMetadata({ url: longUrl });
      mockDal.create.mockResolvedValue(createExistingSession());

      await service.upsertSession(metadata, true);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          landing_page: longUrl
        })
      );
    });

    it('should handle special characters in session ID', async () => {
      const specialSessionId = 'session-123-abc_DEF.xyz';
      const metadata = createSessionMetadata({ sessionId: specialSessionId });
      mockDal.create.mockResolvedValue(createExistingSession());

      await service.upsertSession(metadata, true);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: specialSessionId
        })
      );
    });
  });
});
