-- Email Reporting System Tables
-- Handles email preferences, report schedules, and sent report tracking

-- =====================================================
-- Table: email_preferences
-- Purpose: Store user email notification preferences per project
-- =====================================================
CREATE TABLE IF NOT EXISTS email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,

    -- Preferences
    daily_report_enabled BOOLEAN DEFAULT false,
    weekly_report_enabled BOOLEAN DEFAULT false,
    monthly_report_enabled BOOLEAN DEFAULT false,

    -- Daily report configuration
    daily_report_time TIME DEFAULT '09:00:00', -- Local time to send daily reports

    -- Weekly report configuration
    weekly_report_day INTEGER DEFAULT 1, -- Day of week (0=Sunday, 1=Monday, etc.)
    weekly_report_time TIME DEFAULT '09:00:00',

    -- Monthly report configuration
    monthly_report_day INTEGER DEFAULT 1, -- Day of month (1-28)
    monthly_report_time TIME DEFAULT '09:00:00',

    -- Unsubscribe management
    unsubscribe_token VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    unsubscribed_at TIMESTAMP,

    -- Timezone for report scheduling
    timezone VARCHAR(100) DEFAULT 'UTC',

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(project_id, user_email)
);

-- Indexes for email_preferences
CREATE INDEX idx_email_preferences_project_id ON email_preferences(project_id);
CREATE INDEX idx_email_preferences_user_email ON email_preferences(user_email);
CREATE INDEX idx_email_preferences_unsubscribe_token ON email_preferences(unsubscribe_token);
CREATE INDEX idx_email_preferences_active ON email_preferences(is_active) WHERE is_active = true;
CREATE INDEX idx_email_preferences_daily_enabled ON email_preferences(daily_report_enabled) WHERE daily_report_enabled = true;
CREATE INDEX idx_email_preferences_weekly_enabled ON email_preferences(weekly_report_enabled) WHERE weekly_report_enabled = true;
CREATE INDEX idx_email_preferences_monthly_enabled ON email_preferences(monthly_report_enabled) WHERE monthly_report_enabled = true;

-- =====================================================
-- Table: email_reports
-- Purpose: Track sent email reports (history and status)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email_preference_id UUID REFERENCES email_preferences(id) ON DELETE SET NULL,

    -- Report details
    report_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'test'
    recipient_email VARCHAR(255) NOT NULL,

    -- Date range covered by the report
    report_start_date DATE NOT NULL,
    report_end_date DATE NOT NULL,

    -- Sending status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
    sent_at TIMESTAMP,
    error_message TEXT,

    -- Email service details
    email_service_message_id VARCHAR(255), -- SES message ID or similar

    -- Report content snapshot (for debugging/audit)
    report_data JSONB, -- Summary metrics included in the email

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for email_reports
CREATE INDEX idx_email_reports_project_id ON email_reports(project_id);
CREATE INDEX idx_email_reports_preference_id ON email_reports(email_preference_id);
CREATE INDEX idx_email_reports_recipient ON email_reports(recipient_email);
CREATE INDEX idx_email_reports_type ON email_reports(report_type);
CREATE INDEX idx_email_reports_status ON email_reports(status);
CREATE INDEX idx_email_reports_sent_at ON email_reports(sent_at);
CREATE INDEX idx_email_reports_created_at ON email_reports(created_at);
CREATE INDEX idx_email_reports_date_range ON email_reports(report_start_date, report_end_date);

-- Composite index for finding recent reports for a recipient
CREATE INDEX idx_email_reports_recipient_date ON email_reports(recipient_email, sent_at DESC);

-- =====================================================
-- Trigger: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_preferences_updated_at_trigger
    BEFORE UPDATE ON email_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_email_preferences_updated_at();

CREATE OR REPLACE FUNCTION update_email_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_reports_updated_at_trigger
    BEFORE UPDATE ON email_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_email_reports_updated_at();

-- =====================================================
-- Helper function: Generate unsubscribe token
-- =====================================================
CREATE OR REPLACE FUNCTION generate_unsubscribe_token()
RETURNS VARCHAR(255) AS $$
DECLARE
    token VARCHAR(255);
    token_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random token (URL-safe)
        token := encode(gen_random_bytes(32), 'base64');
        token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');

        -- Check if token already exists
        SELECT EXISTS(SELECT 1 FROM email_preferences WHERE unsubscribe_token = token) INTO token_exists;

        EXIT WHEN NOT token_exists;
    END LOOP;

    RETURN token;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Trigger: Auto-generate unsubscribe token
-- =====================================================
CREATE OR REPLACE FUNCTION set_unsubscribe_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unsubscribe_token IS NULL OR NEW.unsubscribe_token = '' THEN
        NEW.unsubscribe_token := generate_unsubscribe_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_preferences_set_token_trigger
    BEFORE INSERT ON email_preferences
    FOR EACH ROW
    EXECUTE FUNCTION set_unsubscribe_token();
