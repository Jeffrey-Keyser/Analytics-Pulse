-- Analytics-Pulse: API Keys Table
-- Stores hashed API keys for authenticating tracking requests

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(10) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used_at ON api_keys(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_project_active ON api_keys(project_id, is_active);

-- Add trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE api_keys IS 'API keys for authenticating tracking requests from client applications';
COMMENT ON COLUMN api_keys.id IS 'Unique identifier for the API key (UUID)';
COMMENT ON COLUMN api_keys.project_id IS 'Reference to the project this key belongs to';
COMMENT ON COLUMN api_keys.key_hash IS 'Bcrypt hash of the API key (never store plain key)';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters of the key for display (e.g., "ap_abc12")';
COMMENT ON COLUMN api_keys.name IS 'Human-readable name for the API key';
COMMENT ON COLUMN api_keys.description IS 'Optional description of where/how the key is used';
COMMENT ON COLUMN api_keys.is_active IS 'Whether the key is active and can authenticate requests';
COMMENT ON COLUMN api_keys.last_used_at IS 'Timestamp when the key was last used for authentication';
COMMENT ON COLUMN api_keys.created_at IS 'Timestamp when the key was created';
COMMENT ON COLUMN api_keys.updated_at IS 'Timestamp when the key was last updated';
