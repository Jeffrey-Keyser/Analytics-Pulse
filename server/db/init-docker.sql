-- Docker PostgreSQL Initialization Script
-- This script runs automatically when the PostgreSQL container is first created
-- It sets up the basic database structure for development

-- Ensure the database is created (usually already done by POSTGRES_DB env var)
-- CREATE DATABASE template_dev;

-- Connect to the database
\c template_dev;

-- Create public schema if it doesn't exist (usually already present)
CREATE SCHEMA IF NOT EXISTS public;

-- Set search_path for subsequent commands
SET search_path TO public;

-- ============================================================================
-- Session Tables (for authentication)
-- ============================================================================
-- Session table for express-session with connect-pg-simple
CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON user_sessions(expire);

-- ============================================================================
-- Optional: Add your application-specific tables here
-- ============================================================================
-- Example table structure (uncomment and modify as needed):
/*
CREATE SEQUENCE IF NOT EXISTS user_id_seq START 1000;
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY DEFAULT nextval('user_id_seq'),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

-- ============================================================================
-- Development Data (Optional)
-- ============================================================================
-- Add sample data for development here
-- Example:
/*
INSERT INTO users (email) VALUES
  ('test@example.com'),
  ('demo@example.com');
*/
