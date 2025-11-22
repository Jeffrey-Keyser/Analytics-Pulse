-- Analytics-Pulse: Events Table (Partitioned)
-- Stores raw analytics events with time-series partitioning for optimal performance

-- Create the partitioned events table (parent table)
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(255),
    url TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip_hash VARCHAR(64) NOT NULL,
    country VARCHAR(2),
    city VARCHAR(255),
    browser VARCHAR(50),
    os VARCHAR(50),
    device_type VARCHAR(20),
    screen_width INTEGER,
    screen_height INTEGER,
    viewport_width INTEGER,
    viewport_height INTEGER,
    language VARCHAR(10),
    timezone VARCHAR(50),
    custom_data JSONB,
    utm_params JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create indexes on the parent table (will be inherited by partitions)
CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_ip_hash ON events(ip_hash);
CREATE INDEX IF NOT EXISTS idx_events_country ON events(country, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_browser ON events(browser, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_os ON events(os, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_device_type ON events(device_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_custom_data ON events USING GIN (custom_data);
CREATE INDEX IF NOT EXISTS idx_events_url ON events(url);
CREATE INDEX IF NOT EXISTS idx_events_utm_params ON events USING GIN (utm_params);
CREATE INDEX IF NOT EXISTS idx_events_utm_source ON events ((utm_params->>'utm_source'));
CREATE INDEX IF NOT EXISTS idx_events_utm_medium ON events ((utm_params->>'utm_medium'));
CREATE INDEX IF NOT EXISTS idx_events_utm_campaign ON events ((utm_params->>'utm_campaign'));

-- Function to create a new monthly partition
CREATE OR REPLACE FUNCTION create_events_partition(partition_date DATE)
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Calculate partition boundaries
    start_date := DATE_TRUNC('month', partition_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'events_' || TO_CHAR(start_date, 'YYYY_MM');

    -- Check if partition already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
        AND n.nspname = 'public'
    ) THEN
        -- Create the partition
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF events
            FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            start_date,
            end_date
        );

        RAISE NOTICE 'Created partition: %', partition_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create partition on insert if it doesn't exist
CREATE OR REPLACE FUNCTION ensure_events_partition()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_events_partition(NEW.timestamp::DATE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure partition exists before insert
DROP TRIGGER IF EXISTS ensure_events_partition_trigger ON events;
CREATE TRIGGER ensure_events_partition_trigger
    BEFORE INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION ensure_events_partition();

-- Create partitions for current month, next month, and previous month
SELECT create_events_partition(CURRENT_DATE);
SELECT create_events_partition(CURRENT_DATE + INTERVAL '1 month');
SELECT create_events_partition(CURRENT_DATE - INTERVAL '1 month');

-- Add comments for documentation
COMMENT ON TABLE events IS 'Raw analytics events with automatic monthly partitioning for time-series data';
COMMENT ON COLUMN events.id IS 'Unique identifier for the event (UUID)';
COMMENT ON COLUMN events.project_id IS 'Reference to the project this event belongs to';
COMMENT ON COLUMN events.session_id IS 'Session identifier grouping related events';
COMMENT ON COLUMN events.event_type IS 'Type of event (pageview, click, custom, etc.)';
COMMENT ON COLUMN events.event_name IS 'Name of the event (for custom events)';
COMMENT ON COLUMN events.url IS 'URL where the event occurred';
COMMENT ON COLUMN events.referrer IS 'Referrer URL';
COMMENT ON COLUMN events.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN events.ip_hash IS 'SHA-256 hash of IP address for privacy';
COMMENT ON COLUMN events.country IS 'ISO country code (from IP geolocation)';
COMMENT ON COLUMN events.city IS 'City name (from IP geolocation)';
COMMENT ON COLUMN events.browser IS 'Browser name (parsed from user agent)';
COMMENT ON COLUMN events.os IS 'Operating system (parsed from user agent)';
COMMENT ON COLUMN events.device_type IS 'Device type (desktop, mobile, tablet)';
COMMENT ON COLUMN events.screen_width IS 'Screen width in pixels';
COMMENT ON COLUMN events.screen_height IS 'Screen height in pixels';
COMMENT ON COLUMN events.viewport_width IS 'Viewport width in pixels';
COMMENT ON COLUMN events.viewport_height IS 'Viewport height in pixels';
COMMENT ON COLUMN events.language IS 'Browser language setting';
COMMENT ON COLUMN events.timezone IS 'Browser timezone';
COMMENT ON COLUMN events.custom_data IS 'Custom event properties (JSON)';
COMMENT ON COLUMN events.utm_params IS 'UTM parameters for campaign attribution (JSON: utm_source, utm_medium, utm_campaign, utm_term, utm_content)';
COMMENT ON COLUMN events.timestamp IS 'When the event occurred (used for partitioning)';
COMMENT ON COLUMN events.created_at IS 'When the event was recorded in the database';
