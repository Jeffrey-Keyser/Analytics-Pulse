-- Create analytics_projects table
-- This table stores information about tracked projects/sites

CREATE TABLE IF NOT EXISTS analytics_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    description TEXT,
    api_key VARCHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    owner_user_id VARCHAR(255), -- References external user system
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on api_key for fast lookups during event ingestion
CREATE INDEX IF NOT EXISTS idx_analytics_projects_api_key ON analytics_projects(api_key);

-- Create index on owner_user_id for filtering projects by user
CREATE INDEX IF NOT EXISTS idx_analytics_projects_owner ON analytics_projects(owner_user_id);

-- Create index on active projects
CREATE INDEX IF NOT EXISTS idx_analytics_projects_active ON analytics_projects(is_active) WHERE is_active = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_analytics_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analytics_projects_updated_at
    BEFORE UPDATE ON analytics_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_projects_updated_at();
