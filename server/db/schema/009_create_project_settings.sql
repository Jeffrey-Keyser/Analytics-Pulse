-- Analytics-Pulse: Project Settings Table
-- Stores configurable settings for each project including error reporting configuration

CREATE TABLE IF NOT EXISTS project_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    error_reporting JSONB NOT NULL DEFAULT '{
        "enabled": false,
        "createGitHubIssues": false,
        "githubRepo": null,
        "githubToken": null,
        "issueLabels": ["bug", "auto-generated"],
        "rateLimit": {
            "maxIssuesPerDay": 10
        },
        "filters": {
            "minOccurrences": 1,
            "ignorePatterns": [],
            "statusCodes": [500, 502, 503]
        }
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for quick lookup by project
CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON project_settings(project_id);

-- Add trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_project_settings_updated_at ON project_settings;
CREATE TRIGGER update_project_settings_updated_at
    BEFORE UPDATE ON project_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create settings when a project is created
CREATE OR REPLACE FUNCTION create_project_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO project_settings (project_id)
    VALUES (NEW.id)
    ON CONFLICT (project_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create settings for new projects
DROP TRIGGER IF EXISTS auto_create_project_settings ON projects;
CREATE TRIGGER auto_create_project_settings
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION create_project_settings();

-- Create settings for existing projects that don't have them
INSERT INTO project_settings (project_id)
SELECT id FROM projects
WHERE NOT EXISTS (
    SELECT 1 FROM project_settings WHERE project_settings.project_id = projects.id
)
ON CONFLICT (project_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE project_settings IS 'Configurable settings for each project including error reporting configuration';
COMMENT ON COLUMN project_settings.id IS 'Unique identifier for the settings record (UUID)';
COMMENT ON COLUMN project_settings.project_id IS 'Reference to the project these settings belong to (unique)';
COMMENT ON COLUMN project_settings.error_reporting IS 'Error reporting configuration (JSON with enabled, createGitHubIssues, githubRepo, etc.)';
COMMENT ON COLUMN project_settings.created_at IS 'Timestamp when the settings were created';
COMMENT ON COLUMN project_settings.updated_at IS 'Timestamp when the settings were last updated';
