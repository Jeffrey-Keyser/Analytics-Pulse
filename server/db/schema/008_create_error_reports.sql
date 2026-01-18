-- Analytics-Pulse: Error Reports Table
-- Stores runtime error reports from client-side and server-side applications
-- with support for deduplication and GitHub issue integration

CREATE TABLE IF NOT EXISTS error_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    fingerprint VARCHAR(255) NOT NULL,
    error_type VARCHAR(50) NOT NULL,
    error_code VARCHAR(50),
    message TEXT NOT NULL,
    stack_trace TEXT,
    url VARCHAR(2048),
    user_id VARCHAR(255),
    environment JSONB,
    metadata JSONB,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    github_issue_number INTEGER,
    github_issue_state VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_fingerprint_per_project UNIQUE (project_id, fingerprint),
    CONSTRAINT valid_error_type CHECK (error_type IN ('client', 'server')),
    CONSTRAINT valid_github_issue_state CHECK (github_issue_state IS NULL OR github_issue_state IN ('open', 'closed'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_error_reports_project_id ON error_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_project_fingerprint ON error_reports(project_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_reports_last_seen ON error_reports(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_first_seen ON error_reports(first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_error_type ON error_reports(error_type);
CREATE INDEX IF NOT EXISTS idx_error_reports_error_code ON error_reports(error_code);
CREATE INDEX IF NOT EXISTS idx_error_reports_github_issue ON error_reports(github_issue_number) WHERE github_issue_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_reports_occurrence_count ON error_reports(occurrence_count DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_project_last_seen ON error_reports(project_id, last_seen_at DESC);

-- Add trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_error_reports_updated_at ON error_reports;
CREATE TRIGGER update_error_reports_updated_at
    BEFORE UPDATE ON error_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE error_reports IS 'Runtime error reports from client-side and server-side applications with deduplication';
COMMENT ON COLUMN error_reports.id IS 'Unique identifier for the error report (UUID)';
COMMENT ON COLUMN error_reports.project_id IS 'Reference to the project this error belongs to';
COMMENT ON COLUMN error_reports.fingerprint IS 'Unique fingerprint for deduplication (format: {project}:{errorType}:{errorCode}:{messageHash}:{urlPath})';
COMMENT ON COLUMN error_reports.error_type IS 'Type of error: client (browser) or server (Express/Node)';
COMMENT ON COLUMN error_reports.error_code IS 'HTTP status code or error name (e.g., 500, TypeError)';
COMMENT ON COLUMN error_reports.message IS 'Error message text';
COMMENT ON COLUMN error_reports.stack_trace IS 'Full stack trace if available';
COMMENT ON COLUMN error_reports.url IS 'URL where the error occurred';
COMMENT ON COLUMN error_reports.user_id IS 'Optional anonymized user identifier';
COMMENT ON COLUMN error_reports.environment IS 'Environment context (browser, OS, Node version, etc.)';
COMMENT ON COLUMN error_reports.metadata IS 'Additional contextual metadata';
COMMENT ON COLUMN error_reports.occurrence_count IS 'Number of times this exact error has occurred';
COMMENT ON COLUMN error_reports.first_seen_at IS 'Timestamp when this error was first reported';
COMMENT ON COLUMN error_reports.last_seen_at IS 'Timestamp when this error was most recently reported';
COMMENT ON COLUMN error_reports.github_issue_number IS 'GitHub issue number if an issue was created';
COMMENT ON COLUMN error_reports.github_issue_state IS 'Current state of the linked GitHub issue (open/closed)';
COMMENT ON COLUMN error_reports.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN error_reports.updated_at IS 'Timestamp when the record was last updated';
