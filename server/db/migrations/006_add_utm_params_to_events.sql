-- Add UTM parameters column to events table for campaign tracking
-- Migration: 006_add_utm_params_to_events.sql

-- Add utm_params JSONB column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS utm_params JSONB;

-- Create GIN index on utm_params for efficient querying
CREATE INDEX IF NOT EXISTS idx_events_utm_params ON events USING GIN (utm_params);

-- Create indexes for specific UTM fields (using JSONB operators)
CREATE INDEX IF NOT EXISTS idx_events_utm_source ON events ((utm_params->>'utm_source'));
CREATE INDEX IF NOT EXISTS idx_events_utm_medium ON events ((utm_params->>'utm_medium'));
CREATE INDEX IF NOT EXISTS idx_events_utm_campaign ON events ((utm_params->>'utm_campaign'));

-- Add comment for documentation
COMMENT ON COLUMN events.utm_params IS 'UTM parameters for campaign attribution (JSON: utm_source, utm_medium, utm_campaign, utm_term, utm_content)';
