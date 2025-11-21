-- Analytics-Pulse: Analytics Daily Table
-- Stores pre-computed daily analytics metrics for fast reporting

CREATE TABLE IF NOT EXISTS analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Traffic metrics
    pageviews INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    sessions INTEGER NOT NULL DEFAULT 0,
    bounce_rate NUMERIC(5,2),
    avg_session_duration_seconds INTEGER,

    -- Top pages (stored as JSONB for flexibility)
    top_pages JSONB,

    -- Traffic sources
    top_referrers JSONB,

    -- Geographic data
    top_countries JSONB,
    top_cities JSONB,

    -- Technology data
    top_browsers JSONB,
    top_os JSONB,
    device_breakdown JSONB,

    -- Engagement metrics
    events_count INTEGER NOT NULL DEFAULT 0,
    avg_events_per_session NUMERIC(8,2),

    -- Custom events aggregation
    top_custom_events JSONB,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one record per project per day
    UNIQUE(project_id, date)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_daily_project_date ON analytics_daily(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_pageviews ON analytics_daily(project_id, pageviews DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_unique_visitors ON analytics_daily(project_id, unique_visitors DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_sessions ON analytics_daily(project_id, sessions DESC);

-- Indexes for JSONB columns to enable efficient queries
CREATE INDEX IF NOT EXISTS idx_analytics_daily_top_pages ON analytics_daily USING GIN (top_pages);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_top_referrers ON analytics_daily USING GIN (top_referrers);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_top_countries ON analytics_daily USING GIN (top_countries);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_device_breakdown ON analytics_daily USING GIN (device_breakdown);

-- Add trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_analytics_daily_updated_at ON analytics_daily;
CREATE TRIGGER update_analytics_daily_updated_at
    BEFORE UPDATE ON analytics_daily
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE analytics_daily IS 'Pre-computed daily analytics metrics for fast reporting and dashboards';
COMMENT ON COLUMN analytics_daily.id IS 'Unique identifier for the daily record (UUID)';
COMMENT ON COLUMN analytics_daily.project_id IS 'Reference to the project';
COMMENT ON COLUMN analytics_daily.date IS 'Date for this daily aggregation (UTC)';
COMMENT ON COLUMN analytics_daily.pageviews IS 'Total pageviews for the day';
COMMENT ON COLUMN analytics_daily.unique_visitors IS 'Unique visitors (by IP hash) for the day';
COMMENT ON COLUMN analytics_daily.sessions IS 'Total sessions for the day';
COMMENT ON COLUMN analytics_daily.bounce_rate IS 'Bounce rate percentage (0-100)';
COMMENT ON COLUMN analytics_daily.avg_session_duration_seconds IS 'Average session duration in seconds';
COMMENT ON COLUMN analytics_daily.top_pages IS 'Top pages by views: [{"url": "...", "views": 123}, ...]';
COMMENT ON COLUMN analytics_daily.top_referrers IS 'Top referrers: [{"referrer": "...", "count": 123}, ...]';
COMMENT ON COLUMN analytics_daily.top_countries IS 'Top countries by visitors: [{"country": "US", "visitors": 123}, ...]';
COMMENT ON COLUMN analytics_daily.top_cities IS 'Top cities by visitors: [{"city": "...", "visitors": 123}, ...]';
COMMENT ON COLUMN analytics_daily.top_browsers IS 'Top browsers: [{"browser": "Chrome", "count": 123}, ...]';
COMMENT ON COLUMN analytics_daily.top_os IS 'Top operating systems: [{"os": "Windows", "count": 123}, ...]';
COMMENT ON COLUMN analytics_daily.device_breakdown IS 'Device type breakdown: {"desktop": 123, "mobile": 456, "tablet": 78}';
COMMENT ON COLUMN analytics_daily.events_count IS 'Total events for the day';
COMMENT ON COLUMN analytics_daily.avg_events_per_session IS 'Average events per session';
COMMENT ON COLUMN analytics_daily.top_custom_events IS 'Top custom events: [{"event": "...", "count": 123}, ...]';
COMMENT ON COLUMN analytics_daily.created_at IS 'When this record was created';
COMMENT ON COLUMN analytics_daily.updated_at IS 'When this record was last updated';
