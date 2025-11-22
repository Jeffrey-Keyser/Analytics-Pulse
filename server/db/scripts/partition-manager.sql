-- ========================================
-- Analytics-Pulse Partition Manager
-- ========================================
-- This script provides partition management functions for:
-- - Proactive partition creation (3-6 months ahead)
-- - Data retention and cleanup (default: 12 months)
-- - Partition monitoring and health checks
-- - Maintenance operations (ANALYZE, VACUUM)

-- ========================================
-- Configuration Table
-- ========================================

CREATE TABLE IF NOT EXISTS partition_config (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL UNIQUE,
    retention_months INTEGER NOT NULL DEFAULT 12,
    future_partitions INTEGER NOT NULL DEFAULT 6,
    last_maintenance_at TIMESTAMP,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configurations for partitioned tables
INSERT INTO partition_config (table_name, retention_months, future_partitions, is_enabled)
VALUES
    ('events', 12, 6, true),
    ('goal_completions', 12, 6, true)
ON CONFLICT (table_name) DO NOTHING;

-- ========================================
-- Partition Metadata Tracking
-- ========================================

CREATE TABLE IF NOT EXISTS partition_metadata (
    id SERIAL PRIMARY KEY,
    parent_table VARCHAR(255) NOT NULL,
    partition_name VARCHAR(255) NOT NULL UNIQUE,
    partition_date DATE NOT NULL,
    row_count BIGINT DEFAULT 0,
    size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_analyzed_at TIMESTAMP,
    last_vacuumed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partition_metadata_parent_table
ON partition_metadata(parent_table, partition_date DESC);

-- ========================================
-- Function: Create Future Partitions
-- ========================================

CREATE OR REPLACE FUNCTION create_future_partitions(
    p_table_name VARCHAR,
    p_months_ahead INTEGER DEFAULT 6
) RETURNS TABLE(partition_name VARCHAR, status VARCHAR, message VARCHAR) AS $$
DECLARE
    v_partition_date DATE;
    v_partition_name VARCHAR;
    v_start_date DATE;
    v_end_date DATE;
    v_sql TEXT;
    v_create_function VARCHAR;
BEGIN
    -- Determine which partition creation function to use
    IF p_table_name = 'events' THEN
        v_create_function := 'create_events_partition';
    ELSIF p_table_name = 'goal_completions' THEN
        v_create_function := 'create_goal_completions_partition';
    ELSE
        partition_name := p_table_name;
        status := 'ERROR';
        message := 'Unknown table: ' || p_table_name;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Create partitions for next N months
    FOR i IN 0..p_months_ahead LOOP
        v_partition_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL)::DATE;
        v_partition_name := p_table_name || '_' || TO_CHAR(v_partition_date, 'YYYY_MM');

        BEGIN
            -- Use existing partition creation function
            EXECUTE format('SELECT %I($1)', v_create_function) USING v_partition_date;

            -- Track in metadata
            INSERT INTO partition_metadata (parent_table, partition_name, partition_date, created_at)
            VALUES (p_table_name, v_partition_name, v_partition_date, CURRENT_TIMESTAMP)
            ON CONFLICT (partition_name) DO UPDATE SET last_analyzed_at = CURRENT_TIMESTAMP;

            partition_name := v_partition_name;
            status := 'CREATED';
            message := 'Partition created for ' || TO_CHAR(v_partition_date, 'YYYY-MM');
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            partition_name := v_partition_name;
            status := 'ERROR';
            message := SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Function: Drop Old Partitions (Retention Policy)
-- ========================================

CREATE OR REPLACE FUNCTION drop_old_partitions(
    p_table_name VARCHAR,
    p_retention_months INTEGER DEFAULT 12,
    p_dry_run BOOLEAN DEFAULT true
) RETURNS TABLE(partition_name VARCHAR, status VARCHAR, message VARCHAR, row_count BIGINT) AS $$
DECLARE
    v_partition RECORD;
    v_cutoff_date DATE;
    v_sql TEXT;
    v_row_count BIGINT;
BEGIN
    -- Calculate cutoff date
    v_cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (p_retention_months || ' months')::INTERVAL)::DATE;

    -- Find partitions older than retention period
    FOR v_partition IN
        SELECT
            tablename,
            split_part(tablename, '_', array_length(string_to_array(tablename, '_'), 1) - 1) || '-' ||
            split_part(tablename, '_', array_length(string_to_array(tablename, '_'), 1)) as date_str
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE p_table_name || '_%'
        AND tablename ~ '^\w+_\d{4}_\d{2}$'
    LOOP
        -- Extract partition date from name (e.g., events_2024_01 -> 2024-01-01)
        DECLARE
            v_year VARCHAR;
            v_month VARCHAR;
            v_partition_date DATE;
        BEGIN
            v_year := split_part(v_partition.tablename, '_', array_length(string_to_array(v_partition.tablename, '_'), 1) - 1);
            v_month := split_part(v_partition.tablename, '_', array_length(string_to_array(v_partition.tablename, '_'), 1));
            v_partition_date := (v_year || '-' || v_month || '-01')::DATE;

            IF v_partition_date < v_cutoff_date THEN
                -- Get row count before dropping
                EXECUTE format('SELECT COUNT(*) FROM %I', v_partition.tablename) INTO v_row_count;

                IF p_dry_run THEN
                    partition_name := v_partition.tablename;
                    status := 'DRY_RUN';
                    message := 'Would drop partition dated ' || v_partition_date::TEXT || ' (older than ' || p_retention_months || ' months)';
                    row_count := v_row_count;
                    RETURN NEXT;
                ELSE
                    BEGIN
                        -- Detach partition first (non-blocking in PG 14+)
                        EXECUTE format('ALTER TABLE %I DETACH PARTITION %I', p_table_name, v_partition.tablename);

                        -- Drop the detached partition
                        EXECUTE format('DROP TABLE IF EXISTS %I', v_partition.tablename);

                        -- Remove from metadata
                        DELETE FROM partition_metadata WHERE partition_name = v_partition.tablename;

                        partition_name := v_partition.tablename;
                        status := 'DROPPED';
                        message := 'Dropped partition dated ' || v_partition_date::TEXT || ' (older than ' || p_retention_months || ' months)';
                        row_count := v_row_count;
                        RETURN NEXT;

                    EXCEPTION WHEN OTHERS THEN
                        partition_name := v_partition.tablename;
                        status := 'ERROR';
                        message := SQLERRM;
                        row_count := v_row_count;
                        RETURN NEXT;
                    END;
                END IF;
            END IF;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Function: Analyze Partition Statistics
-- ========================================

CREATE OR REPLACE FUNCTION analyze_partitions(
    p_table_name VARCHAR
) RETURNS TABLE(partition_name VARCHAR, row_count BIGINT, size_mb NUMERIC, status VARCHAR) AS $$
DECLARE
    v_partition RECORD;
    v_row_count BIGINT;
    v_size_bytes BIGINT;
BEGIN
    FOR v_partition IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE p_table_name || '_%'
        AND tablename ~ '^\w+_\d{4}_\d{2}$'
        ORDER BY tablename DESC
    LOOP
        BEGIN
            -- Get row count
            EXECUTE format('SELECT COUNT(*) FROM %I', v_partition.tablename) INTO v_row_count;

            -- Get table size
            EXECUTE format('SELECT pg_total_relation_size(%L)', v_partition.tablename) INTO v_size_bytes;

            -- Run ANALYZE on partition
            EXECUTE format('ANALYZE %I', v_partition.tablename);

            -- Update metadata
            UPDATE partition_metadata
            SET
                row_count = v_row_count,
                size_bytes = v_size_bytes,
                last_analyzed_at = CURRENT_TIMESTAMP
            WHERE partition_metadata.partition_name = v_partition.tablename;

            partition_name := v_partition.tablename;
            row_count := v_row_count;
            size_mb := ROUND(v_size_bytes::NUMERIC / (1024*1024), 2);
            status := 'ANALYZED';
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            partition_name := v_partition.tablename;
            row_count := 0;
            size_mb := 0;
            status := 'ERROR: ' || SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Function: Vacuum Partitions
-- ========================================

CREATE OR REPLACE FUNCTION vacuum_partitions(
    p_table_name VARCHAR,
    p_full BOOLEAN DEFAULT false
) RETURNS TABLE(partition_name VARCHAR, status VARCHAR, message VARCHAR) AS $$
DECLARE
    v_partition RECORD;
    v_sql TEXT;
BEGIN
    FOR v_partition IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE p_table_name || '_%'
        AND tablename ~ '^\w+_\d{4}_\d{2}$'
        ORDER BY tablename DESC
    LOOP
        BEGIN
            IF p_full THEN
                v_sql := format('VACUUM FULL %I', v_partition.tablename);
            ELSE
                v_sql := format('VACUUM %I', v_partition.tablename);
            END IF;

            EXECUTE v_sql;

            -- Update metadata
            UPDATE partition_metadata
            SET last_vacuumed_at = CURRENT_TIMESTAMP
            WHERE partition_metadata.partition_name = v_partition.tablename;

            partition_name := v_partition.tablename;
            status := 'VACUUMED';
            message := 'Vacuum ' || CASE WHEN p_full THEN 'FULL' ELSE '' END || ' completed';
            RETURN NEXT;

        EXCEPTION WHEN OTHERS THEN
            partition_name := v_partition.tablename;
            status := 'ERROR';
            message := SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Function: List All Partitions
-- ========================================

CREATE OR REPLACE FUNCTION list_partitions(
    p_table_name VARCHAR DEFAULT NULL
) RETURNS TABLE(
    parent_table VARCHAR,
    partition_name VARCHAR,
    partition_date DATE,
    row_count BIGINT,
    size_mb NUMERIC,
    last_analyzed_at TIMESTAMP,
    last_vacuumed_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pm.parent_table,
        pm.partition_name,
        pm.partition_date,
        pm.row_count,
        ROUND(pm.size_bytes::NUMERIC / (1024*1024), 2) as size_mb,
        pm.last_analyzed_at,
        pm.last_vacuumed_at
    FROM partition_metadata pm
    WHERE p_table_name IS NULL OR pm.parent_table = p_table_name
    ORDER BY pm.parent_table, pm.partition_date DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Function: Get Partition Health Summary
-- ========================================

CREATE OR REPLACE FUNCTION partition_health_summary()
RETURNS TABLE(
    table_name VARCHAR,
    total_partitions BIGINT,
    total_rows BIGINT,
    total_size_mb NUMERIC,
    oldest_partition DATE,
    newest_partition DATE,
    retention_months INTEGER,
    partitions_to_drop INTEGER,
    health_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH partition_stats AS (
        SELECT
            pm.parent_table,
            COUNT(*) as partition_count,
            SUM(pm.row_count) as total_row_count,
            SUM(pm.size_bytes) as total_size,
            MIN(pm.partition_date) as min_date,
            MAX(pm.partition_date) as max_date
        FROM partition_metadata pm
        GROUP BY pm.parent_table
    ),
    config_data AS (
        SELECT
            pc.table_name,
            pc.retention_months,
            COUNT(*) FILTER (
                WHERE pm.partition_date < DATE_TRUNC('month', CURRENT_DATE - (pc.retention_months || ' months')::INTERVAL)::DATE
            ) as old_partition_count
        FROM partition_config pc
        LEFT JOIN partition_metadata pm ON pm.parent_table = pc.table_name
        WHERE pc.is_enabled = true
        GROUP BY pc.table_name, pc.retention_months
    )
    SELECT
        ps.parent_table,
        ps.partition_count,
        ps.total_row_count,
        ROUND(ps.total_size::NUMERIC / (1024*1024), 2),
        ps.min_date,
        ps.max_date,
        cd.retention_months,
        cd.old_partition_count,
        CASE
            WHEN cd.old_partition_count > 0 THEN 'CLEANUP_NEEDED'
            WHEN ps.partition_count = 0 THEN 'NO_PARTITIONS'
            ELSE 'HEALTHY'
        END
    FROM partition_stats ps
    JOIN config_data cd ON cd.table_name = ps.parent_table;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Function: Run Full Maintenance
-- ========================================

CREATE OR REPLACE FUNCTION run_partition_maintenance(
    p_table_name VARCHAR DEFAULT NULL,
    p_dry_run BOOLEAN DEFAULT false
) RETURNS TABLE(operation VARCHAR, details JSONB) AS $$
DECLARE
    v_table RECORD;
    v_config RECORD;
    v_result JSONB;
BEGIN
    -- Loop through configured tables (or specific table if provided)
    FOR v_config IN
        SELECT * FROM partition_config
        WHERE is_enabled = true
        AND (p_table_name IS NULL OR table_name = p_table_name)
    LOOP
        -- 1. Create future partitions
        SELECT jsonb_agg(row_to_json(r)) INTO v_result
        FROM create_future_partitions(v_config.table_name, v_config.future_partitions) r;

        operation := 'CREATE_FUTURE_PARTITIONS';
        details := jsonb_build_object(
            'table', v_config.table_name,
            'months_ahead', v_config.future_partitions,
            'results', v_result
        );
        RETURN NEXT;

        -- 2. Analyze partitions
        SELECT jsonb_agg(row_to_json(r)) INTO v_result
        FROM analyze_partitions(v_config.table_name) r;

        operation := 'ANALYZE_PARTITIONS';
        details := jsonb_build_object(
            'table', v_config.table_name,
            'results', v_result
        );
        RETURN NEXT;

        -- 3. Drop old partitions (based on retention policy)
        SELECT jsonb_agg(row_to_json(r)) INTO v_result
        FROM drop_old_partitions(v_config.table_name, v_config.retention_months, p_dry_run) r;

        operation := 'DROP_OLD_PARTITIONS';
        details := jsonb_build_object(
            'table', v_config.table_name,
            'retention_months', v_config.retention_months,
            'dry_run', p_dry_run,
            'results', v_result
        );
        RETURN NEXT;

        -- 4. Update last maintenance timestamp
        IF NOT p_dry_run THEN
            UPDATE partition_config
            SET last_maintenance_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE table_name = v_config.table_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Grant Permissions
-- ========================================

GRANT SELECT, INSERT, UPDATE, DELETE ON partition_config TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON partition_metadata TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE partition_config_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE partition_metadata_id_seq TO PUBLIC;

-- ========================================
-- Usage Examples
-- ========================================

-- Create future partitions (next 6 months)
-- SELECT * FROM create_future_partitions('events', 6);
-- SELECT * FROM create_future_partitions('goal_completions', 6);

-- Preview what would be dropped (DRY RUN)
-- SELECT * FROM drop_old_partitions('events', 12, true);

-- Actually drop old partitions
-- SELECT * FROM drop_old_partitions('events', 12, false);

-- Analyze partition statistics
-- SELECT * FROM analyze_partitions('events');

-- Vacuum partitions
-- SELECT * FROM vacuum_partitions('events', false);

-- List all partitions
-- SELECT * FROM list_partitions();
-- SELECT * FROM list_partitions('events');

-- Get health summary
-- SELECT * FROM partition_health_summary();

-- Run full maintenance (DRY RUN)
-- SELECT * FROM run_partition_maintenance(NULL, true);

-- Run full maintenance (ACTUAL)
-- SELECT * FROM run_partition_maintenance(NULL, false);
