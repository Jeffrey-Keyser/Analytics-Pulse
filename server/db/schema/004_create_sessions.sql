-- Analytics-Pulse: Sessions Table
-- Stores aggregated session data for analytics

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id UUID NOT NULL UNIQUE,
    ip_hash VARCHAR(64) NOT NULL,
    user_agent TEXT,
    country VARCHAR(2),
    city VARCHAR(255),
    browser VARCHAR(50),
    os VARCHAR(50),
    device_type VARCHAR(20),
    referrer TEXT,
    landing_page TEXT NOT NULL,
    exit_page TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    language VARCHAR(10),
    timezone VARCHAR(50),
    pageviews INTEGER NOT NULL DEFAULT 0,
    events_count INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    is_bounce BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ip_hash ON sessions(ip_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_country ON sessions(country, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_browser ON sessions(browser, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_os ON sessions(os, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_device_type ON sessions(device_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_referrer ON sessions(referrer);
CREATE INDEX IF NOT EXISTS idx_sessions_is_bounce ON sessions(project_id, is_bounce, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_duration ON sessions(project_id, duration_seconds DESC);

-- Add trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE sessions IS 'Aggregated session data for analytics reporting';
COMMENT ON COLUMN sessions.id IS 'Unique identifier for the database record (UUID)';
COMMENT ON COLUMN sessions.project_id IS 'Reference to the project this session belongs to';
COMMENT ON COLUMN sessions.session_id IS 'Session identifier matching events.session_id';
COMMENT ON COLUMN sessions.ip_hash IS 'SHA-256 hash of IP address for privacy';
COMMENT ON COLUMN sessions.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN sessions.country IS 'ISO country code (from IP geolocation)';
COMMENT ON COLUMN sessions.city IS 'City name (from IP geolocation)';
COMMENT ON COLUMN sessions.browser IS 'Browser name (parsed from user agent)';
COMMENT ON COLUMN sessions.os IS 'Operating system (parsed from user agent)';
COMMENT ON COLUMN sessions.device_type IS 'Device type (desktop, mobile, tablet)';
COMMENT ON COLUMN sessions.referrer IS 'Original referrer URL';
COMMENT ON COLUMN sessions.landing_page IS 'First page viewed in the session';
COMMENT ON COLUMN sessions.exit_page IS 'Last page viewed in the session';
COMMENT ON COLUMN sessions.screen_width IS 'Screen width in pixels';
COMMENT ON COLUMN sessions.screen_height IS 'Screen height in pixels';
COMMENT ON COLUMN sessions.language IS 'Browser language setting';
COMMENT ON COLUMN sessions.timezone IS 'Browser timezone';
COMMENT ON COLUMN sessions.pageviews IS 'Number of pageviews in the session';
COMMENT ON COLUMN sessions.events_count IS 'Total number of events in the session';
COMMENT ON COLUMN sessions.duration_seconds IS 'Session duration in seconds';
COMMENT ON COLUMN sessions.started_at IS 'When the session started';
COMMENT ON COLUMN sessions.ended_at IS 'When the session ended (last event timestamp)';
COMMENT ON COLUMN sessions.is_bounce IS 'Whether the session was a bounce (single pageview)';
COMMENT ON COLUMN sessions.created_at IS 'When the session record was created';
COMMENT ON COLUMN sessions.updated_at IS 'When the session record was last updated';
