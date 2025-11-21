-- Helper functions for analytics operations

-- Generate secure API key for new projects
CREATE OR REPLACE FUNCTION generate_analytics_api_key()
RETURNS VARCHAR(64) AS $$
DECLARE
    key_value VARCHAR(64);
    key_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 32-byte API key (64 hex characters)
        key_value := encode(gen_random_bytes(32), 'hex');

        -- Check if this key already exists
        SELECT EXISTS(SELECT 1 FROM analytics_projects WHERE api_key = key_value) INTO key_exists;

        -- If key doesn't exist, we can use it
        EXIT WHEN NOT key_exists;
    END LOOP;

    RETURN key_value;
END;
$$ LANGUAGE plpgsql;

-- Calculate and update session duration
CREATE OR REPLACE FUNCTION calculate_session_duration(p_session_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE analytics_sessions
    SET
        ended_at = last_activity_at,
        duration_seconds = EXTRACT(EPOCH FROM (last_activity_at - started_at))::INTEGER,
        is_bounce = (page_view_count = 1 AND EXTRACT(EPOCH FROM (last_activity_at - started_at)) < 10)
    WHERE session_id = p_session_id
      AND ended_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Get real-time visitor count for a project (visitors in last 5 minutes)
CREATE OR REPLACE FUNCTION get_realtime_visitors(p_project_id UUID)
RETURNS TABLE(
    active_sessions INTEGER,
    recent_events INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT e.session_id)::INTEGER as active_sessions,
        COUNT(*)::INTEGER as recent_events
    FROM analytics_events e
    WHERE e.project_id = p_project_id
      AND e.timestamp >= NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Get project statistics for a date range
CREATE OR REPLACE FUNCTION get_project_stats(
    p_project_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    total_page_views BIGINT,
    total_sessions BIGINT,
    unique_visitors BIGINT,
    avg_session_duration NUMERIC,
    bounce_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE e.event_type = 'pageview')::BIGINT as total_page_views,
        COUNT(DISTINCT e.session_id)::BIGINT as total_sessions,
        COUNT(DISTINCT e.ip_hash)::BIGINT as unique_visitors,
        ROUND(AVG(s.duration_seconds), 2) as avg_session_duration,
        ROUND(
            COUNT(*) FILTER (WHERE s.is_bounce = true)::NUMERIC /
            NULLIF(COUNT(DISTINCT s.session_id), 0)::NUMERIC * 100,
            2
        ) as bounce_rate
    FROM analytics_events e
    LEFT JOIN analytics_sessions s ON e.session_id = s.session_id
    WHERE e.project_id = p_project_id
      AND e.timestamp >= p_start_date
      AND e.timestamp <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Get top pages for a project in a date range
CREATE OR REPLACE FUNCTION get_top_pages(
    p_project_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    page_url TEXT,
    view_count BIGINT,
    unique_sessions BIGINT,
    avg_load_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.page_url,
        COUNT(*)::BIGINT as view_count,
        COUNT(DISTINCT e.session_id)::BIGINT as unique_sessions,
        ROUND(AVG(e.page_load_time)::NUMERIC, 2) as avg_load_time
    FROM analytics_events e
    WHERE e.project_id = p_project_id
      AND e.event_type = 'pageview'
      AND e.timestamp >= p_start_date
      AND e.timestamp <= p_end_date
    GROUP BY e.page_url
    ORDER BY view_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get events time series data for charts
CREATE OR REPLACE FUNCTION get_events_timeseries(
    p_project_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_interval TEXT DEFAULT '1 hour' -- '1 hour', '1 day', etc.
)
RETURNS TABLE(
    time_bucket TIMESTAMP WITH TIME ZONE,
    page_views BIGINT,
    custom_events BIGINT,
    unique_sessions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        date_trunc(p_interval, e.timestamp) as time_bucket,
        COUNT(*) FILTER (WHERE e.event_type = 'pageview')::BIGINT as page_views,
        COUNT(*) FILTER (WHERE e.event_type = 'custom')::BIGINT as custom_events,
        COUNT(DISTINCT e.session_id)::BIGINT as unique_sessions
    FROM analytics_events e
    WHERE e.project_id = p_project_id
      AND e.timestamp >= p_start_date
      AND e.timestamp <= p_end_date
    GROUP BY time_bucket
    ORDER BY time_bucket;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old sessions (mark as ended if no activity for 30 minutes)
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE analytics_sessions
    SET
        ended_at = last_activity_at,
        duration_seconds = EXTRACT(EPOCH FROM (last_activity_at - started_at))::INTEGER,
        is_bounce = (page_view_count = 1 AND EXTRACT(EPOCH FROM (last_activity_at - started_at)) < 10)
    WHERE ended_at IS NULL
      AND last_activity_at < NOW() - INTERVAL '30 minutes';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_analytics_api_key() IS 'Generate a unique API key for new analytics projects';
COMMENT ON FUNCTION calculate_session_duration(UUID) IS 'Calculate and update session duration and bounce status';
COMMENT ON FUNCTION get_realtime_visitors(UUID) IS 'Get count of active visitors in the last 5 minutes';
COMMENT ON FUNCTION get_project_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Get aggregated statistics for a project in a date range';
COMMENT ON FUNCTION get_top_pages(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER) IS 'Get top pages by view count for a project';
COMMENT ON FUNCTION get_events_timeseries(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT) IS 'Get time-series data for charts';
COMMENT ON FUNCTION cleanup_inactive_sessions() IS 'Mark sessions as ended if inactive for 30+ minutes';
