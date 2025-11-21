-- Create analytics_events table
-- This table stores all page views and custom events (time-series optimized)

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES analytics_projects(id) ON DELETE CASCADE,
    session_id UUID NOT NULL, -- Client-generated session ID
    event_type VARCHAR(50) NOT NULL, -- 'pageview', 'custom', etc.
    event_name VARCHAR(255), -- For custom events
    page_url TEXT NOT NULL,
    page_title VARCHAR(500),
    referrer TEXT,

    -- User agent and device info
    user_agent TEXT,
    browser VARCHAR(50),
    browser_version VARCHAR(50),
    os VARCHAR(50),
    os_version VARCHAR(50),
    device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'

    -- Geographic info (optional, can be derived from IP)
    country_code VARCHAR(2),

    -- IP address (anonymized for privacy)
    ip_hash VARCHAR(64), -- SHA256 hash of IP address

    -- Custom event properties (JSONB for flexibility)
    properties JSONB,

    -- Timing
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Performance metrics (optional)
    page_load_time INTEGER, -- milliseconds

    -- UTM parameters for marketing tracking
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255)
);

-- Critical indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_project_timestamp
    ON analytics_events(project_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session
    ON analytics_events(session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type
    ON analytics_events(event_type);

CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp
    ON analytics_events(timestamp DESC);

-- Index for custom event queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name
    ON analytics_events(event_name) WHERE event_name IS NOT NULL;

-- GIN index for JSONB properties (for querying custom event data)
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties
    ON analytics_events USING gin(properties);

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_project_type_timestamp
    ON analytics_events(project_id, event_type, timestamp DESC);

-- Composite index for UTM tracking queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_utm_source
    ON analytics_events(project_id, utm_source, timestamp DESC)
    WHERE utm_source IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE analytics_events IS 'Stores all analytics events (page views and custom events) with time-series optimization';
COMMENT ON COLUMN analytics_events.ip_hash IS 'SHA256 hash of IP address for privacy-compliant analytics';
COMMENT ON COLUMN analytics_events.properties IS 'Custom properties for events in JSONB format';
