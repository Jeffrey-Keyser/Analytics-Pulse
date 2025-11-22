-- Analytics-Pulse: Goals and Goal Completions Tables
-- Stores conversion goals and tracks their completions

-- Create the goals table
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL,
    target_event_name VARCHAR(255),
    target_url_pattern TEXT,
    target_value NUMERIC(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_goal_target CHECK (
        (goal_type = 'event' AND target_event_name IS NOT NULL) OR
        (goal_type = 'pageview' AND target_url_pattern IS NOT NULL) OR
        (goal_type = 'value' AND target_value IS NOT NULL)
    )
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);
CREATE INDEX IF NOT EXISTS idx_goals_is_active ON goals(is_active);
CREATE INDEX IF NOT EXISTS idx_goals_goal_type ON goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at DESC);

-- Add trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create the goal_completions table (partitioned for performance)
CREATE TABLE IF NOT EXISTS goal_completions (
    id UUID DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    event_id UUID,
    url TEXT,
    value NUMERIC(10, 2),
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create indexes on the parent table (will be inherited by partitions)
CREATE INDEX IF NOT EXISTS idx_goal_completions_goal_id ON goal_completions(goal_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_goal_completions_project_id ON goal_completions(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_goal_completions_session_id ON goal_completions(session_id);
CREATE INDEX IF NOT EXISTS idx_goal_completions_metadata ON goal_completions USING GIN (metadata);

-- Function to create a new monthly partition for goal_completions
CREATE OR REPLACE FUNCTION create_goal_completions_partition(partition_date DATE)
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Calculate partition boundaries
    start_date := DATE_TRUNC('month', partition_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'goal_completions_' || TO_CHAR(start_date, 'YYYY_MM');

    -- Check if partition already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
        AND n.nspname = 'public'
    ) THEN
        -- Create the partition
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF goal_completions
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
CREATE OR REPLACE FUNCTION ensure_goal_completions_partition()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_goal_completions_partition(NEW.timestamp::DATE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure partition exists before insert
DROP TRIGGER IF EXISTS ensure_goal_completions_partition_trigger ON goal_completions;
CREATE TRIGGER ensure_goal_completions_partition_trigger
    BEFORE INSERT ON goal_completions
    FOR EACH ROW
    EXECUTE FUNCTION ensure_goal_completions_partition();

-- Create partitions for current month, next month, and previous month
SELECT create_goal_completions_partition(CURRENT_DATE);
SELECT create_goal_completions_partition(CURRENT_DATE + INTERVAL '1 month');
SELECT create_goal_completions_partition(CURRENT_DATE - INTERVAL '1 month');

-- Add comments for documentation
COMMENT ON TABLE goals IS 'Conversion goals for analytics projects';
COMMENT ON COLUMN goals.id IS 'Unique identifier for the goal (UUID)';
COMMENT ON COLUMN goals.project_id IS 'Reference to the project this goal belongs to';
COMMENT ON COLUMN goals.name IS 'Human-readable name of the goal';
COMMENT ON COLUMN goals.description IS 'Optional description of the goal';
COMMENT ON COLUMN goals.goal_type IS 'Type of goal: event, pageview, or value';
COMMENT ON COLUMN goals.target_event_name IS 'Target event name for event-type goals';
COMMENT ON COLUMN goals.target_url_pattern IS 'URL pattern for pageview-type goals (supports wildcards)';
COMMENT ON COLUMN goals.target_value IS 'Target value for value-type goals';
COMMENT ON COLUMN goals.is_active IS 'Whether the goal is actively being tracked';
COMMENT ON COLUMN goals.created_at IS 'Timestamp when the goal was created';
COMMENT ON COLUMN goals.updated_at IS 'Timestamp when the goal was last updated';

COMMENT ON TABLE goal_completions IS 'Tracks when goals are completed (partitioned by month)';
COMMENT ON COLUMN goal_completions.id IS 'Unique identifier for the completion';
COMMENT ON COLUMN goal_completions.goal_id IS 'Reference to the goal that was completed';
COMMENT ON COLUMN goal_completions.project_id IS 'Reference to the project (denormalized for query performance)';
COMMENT ON COLUMN goal_completions.session_id IS 'Session that completed the goal';
COMMENT ON COLUMN goal_completions.event_id IS 'Event that triggered the completion (if applicable)';
COMMENT ON COLUMN goal_completions.url IS 'URL where the completion occurred';
COMMENT ON COLUMN goal_completions.value IS 'Value associated with the completion';
COMMENT ON COLUMN goal_completions.metadata IS 'Additional metadata about the completion (JSON)';
COMMENT ON COLUMN goal_completions.timestamp IS 'When the goal was completed (used for partitioning)';
COMMENT ON COLUMN goal_completions.created_at IS 'When the completion was recorded in the database';
