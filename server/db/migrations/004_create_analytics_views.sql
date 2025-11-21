-- Create materialized view for daily statistics (can be refreshed periodically)
-- This improves query performance for dashboard aggregations

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_stats AS
SELECT
    project_id,
    DATE(timestamp) as date,
    COUNT(*) as total_events,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(*) FILTER (WHERE event_type = 'pageview') as page_views,
    COUNT(*) FILTER (WHERE event_type = 'custom') as custom_events,
    COUNT(DISTINCT ip_hash) as unique_visitors_approx
FROM analytics_events
GROUP BY project_id, DATE(timestamp);

-- Create indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_daily_stats_project_date
    ON analytics_daily_stats(project_id, date DESC);

-- Create view for top pages (real-time)
CREATE OR REPLACE VIEW analytics_top_pages AS
SELECT
    project_id,
    page_url,
    COUNT(*) as view_count,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(page_load_time) as avg_load_time
FROM analytics_events
WHERE event_type = 'pageview'
GROUP BY project_id, page_url;

-- Create view for top referrers (real-time)
CREATE OR REPLACE VIEW analytics_top_referrers AS
SELECT
    project_id,
    referrer,
    COUNT(DISTINCT session_id) as session_count,
    COUNT(*) as event_count
FROM analytics_sessions
WHERE referrer IS NOT NULL AND referrer != ''
GROUP BY project_id, referrer;

-- Create view for browser statistics (real-time)
CREATE OR REPLACE VIEW analytics_browser_stats AS
SELECT
    project_id,
    browser,
    browser_version,
    COUNT(DISTINCT session_id) as session_count
FROM analytics_sessions
WHERE browser IS NOT NULL
GROUP BY project_id, browser, browser_version;

-- Create view for device statistics (real-time)
CREATE OR REPLACE VIEW analytics_device_stats AS
SELECT
    project_id,
    device_type,
    COUNT(DISTINCT session_id) as session_count
FROM analytics_sessions
WHERE device_type IS NOT NULL
GROUP BY project_id, device_type;

-- Create view for UTM campaign performance (real-time)
CREATE OR REPLACE VIEW analytics_utm_performance AS
SELECT
    project_id,
    utm_source,
    utm_medium,
    utm_campaign,
    COUNT(DISTINCT session_id) as session_count,
    AVG(page_view_count) as avg_pages_per_session,
    COUNT(*) FILTER (WHERE is_bounce = true)::float / COUNT(*)::float as bounce_rate
FROM analytics_sessions
WHERE utm_source IS NOT NULL
GROUP BY project_id, utm_source, utm_medium, utm_campaign;

-- Function to refresh the materialized view (can be called manually or via cron)
CREATE OR REPLACE FUNCTION refresh_analytics_daily_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON MATERIALIZED VIEW analytics_daily_stats IS 'Daily aggregated statistics for improved dashboard performance';
COMMENT ON FUNCTION refresh_analytics_daily_stats() IS 'Refresh the daily stats materialized view - call periodically';
