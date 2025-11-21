-- Create analytics_sessions table
-- This table tracks user sessions for analytics (session duration, pages per session, etc.)

CREATE TABLE IF NOT EXISTS analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES analytics_projects(id) ON DELETE CASCADE,
    session_id UUID NOT NULL UNIQUE, -- Client-generated session ID

    -- Session metadata
    first_page_url TEXT NOT NULL,
    last_page_url TEXT,
    referrer TEXT,

    -- User agent and device info (captured at session start)
    user_agent TEXT,
    browser VARCHAR(50),
    browser_version VARCHAR(50),
    os VARCHAR(50),
    os_version VARCHAR(50),
    device_type VARCHAR(50),

    -- Geographic info
    country_code VARCHAR(2),

    -- IP address (anonymized)
    ip_hash VARCHAR(64),

    -- UTM parameters (captured at session start)
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),

    -- Session metrics
    page_view_count INTEGER DEFAULT 1,
    event_count INTEGER DEFAULT 0,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER, -- Calculated: ended_at - started_at

    -- Engagement metrics
    is_bounce BOOLEAN DEFAULT false -- Single page view with short duration
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_project
    ON analytics_sessions(project_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id
    ON analytics_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at
    ON analytics_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_referrer
    ON analytics_sessions(project_id, referrer)
    WHERE referrer IS NOT NULL;

-- Index for UTM tracking
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_utm_source
    ON analytics_sessions(project_id, utm_source, started_at DESC)
    WHERE utm_source IS NOT NULL;

-- Function to update session metrics
CREATE OR REPLACE FUNCTION update_analytics_session_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_activity_at
    UPDATE analytics_sessions
    SET
        last_activity_at = NEW.timestamp,
        last_page_url = NEW.page_url,
        page_view_count = page_view_count + CASE WHEN NEW.event_type = 'pageview' THEN 1 ELSE 0 END,
        event_count = event_count + CASE WHEN NEW.event_type = 'custom' THEN 1 ELSE 0 END
    WHERE session_id = NEW.session_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update session metrics when new events are added
CREATE TRIGGER analytics_events_update_session
    AFTER INSERT ON analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_session_metrics();

COMMENT ON TABLE analytics_sessions IS 'Tracks analytics sessions with engagement metrics';
COMMENT ON COLUMN analytics_sessions.is_bounce IS 'True if session has only one page view with duration < 10 seconds';
