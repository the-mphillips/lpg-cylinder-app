-- Comprehensive App Settings System
-- Run this in your Supabase SQL Editor

-- Create app_settings table with JSON configuration
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    data_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, object, array
    is_public BOOLEAN DEFAULT false, -- If true, can be accessed without authentication
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(50),
    UNIQUE(category, key)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_app_settings_public ON app_settings(is_public) WHERE is_public = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_app_settings_category_key ON app_settings(category, key) WHERE is_active = true;

-- Insert default BWA Gas settings
INSERT INTO app_settings (category, key, value, description, data_type, is_public) VALUES

-- BRANDING SETTINGS
('branding', 'company_name', '"BWA GAS"', 'Company name displayed throughout the application', 'string', true),
('branding', 'logo_light_url', 'null', 'URL to light mode logo image', 'string', true),
('branding', 'logo_dark_url', 'null', 'URL to dark mode logo image', 'string', true),
('branding', 'favicon_url', 'null', 'URL to favicon image', 'string', true),
('branding', 'primary_color', '"#3D3D3D"', 'Primary brand color (hex)', 'string', true),
('branding', 'secondary_color', '"#F79226"', 'Secondary brand color (hex)', 'string', true),
('branding', 'company_tagline', '"LPG Cylinder Testing System"', 'Company tagline or subtitle', 'string', true),
('branding', 'company_address', '{"street": "", "city": "", "state": "", "postcode": "", "country": "Australia"}', 'Company address information', 'object', false),
('branding', 'company_contact', '{"phone": "", "email": "", "website": ""}', 'Company contact information', 'object', true),

-- EMAIL SETTINGS
('email', 'smtp_host', '""', 'SMTP server hostname', 'string', false),
('email', 'smtp_port', '587', 'SMTP server port', 'number', false),
('email', 'smtp_username', '""', 'SMTP username', 'string', false),
('email', 'smtp_password', '""', 'SMTP password (encrypted)', 'string', false),
('email', 'smtp_use_tls', 'true', 'Use TLS encryption', 'boolean', false),
('email', 'from_name', '"BWA GAS Reports"', 'Default sender name', 'string', false),
('email', 'from_email', '""', 'Default sender email', 'string', false),
('email', 'reply_to_email', '""', 'Reply-to email address', 'string', false),
('email', 'email_signature', '"Best regards,\nBWA GAS Team"', 'Default email signature', 'string', false),

-- SYSTEM SETTINGS
('system', 'timezone', '"Australia/Melbourne"', 'Default application timezone', 'string', false),
('system', 'date_format', '"DD/MM/YYYY"', 'Default date format', 'string', true),
('system', 'time_format', '"HH:mm"', 'Default time format', 'string', true),
('system', 'currency', '"AUD"', 'Default currency code', 'string', true),
('system', 'language', '"en_AU"', 'Default application language', 'string', true),
('system', 'session_timeout', '86400', 'Session timeout in seconds (24 hours)', 'number', false),
('system', 'max_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)', 'number', false),
('system', 'backup_retention_days', '30', 'How long to keep database backups', 'number', false),

-- REPORT SETTINGS
('reports', 'default_gas_types', '["LPG", "Natural Gas", "Propane", "Butane"]', 'Available gas types for reports', 'array', true),
('reports', 'default_cylinder_sizes', '["9kg", "15kg", "45kg", "90kg", "210kg"]', 'Available cylinder sizes', 'array', true),
('reports', 'default_gas_suppliers', '["Origin Energy", "AGL", "BOC", "Elgas", "Kleenheat"]', 'Common gas suppliers', 'array', true),
('reports', 'require_work_order', 'false', 'Require work order number for all reports', 'boolean', false),
('reports', 'auto_approve_threshold', '0', 'Auto-approve reports under this value (0 = disabled)', 'number', false),
('reports', 'report_number_format', '"BWA-{YEAR}-{NUMBER:4}"', 'Report number format template', 'string', false),
('reports', 'pdf_footer_text', '"This report is generated by BWA GAS LPG Testing System"', 'Footer text for PDF reports', 'string', false),

-- SECURITY SETTINGS
('security', 'password_min_length', '8', 'Minimum password length', 'number', false),
('security', 'password_require_uppercase', 'true', 'Require uppercase letters in passwords', 'boolean', false),
('security', 'password_require_numbers', 'true', 'Require numbers in passwords', 'boolean', false),
('security', 'password_require_special', 'false', 'Require special characters in passwords', 'boolean', false),
('security', 'max_login_attempts', '5', 'Maximum failed login attempts before lockout', 'number', false),
('security', 'lockout_duration', '900', 'Account lockout duration in seconds (15 minutes)', 'number', false),
('security', 'force_password_change_days', '90', 'Force password change after X days (0 = disabled)', 'number', false),

-- NOTIFICATION SETTINGS
('notifications', 'email_on_report_submit', 'true', 'Send email when report is submitted for approval', 'boolean', false),
('notifications', 'email_on_report_approve', 'true', 'Send email when report is approved', 'boolean', false),
('notifications', 'email_on_user_create', 'true', 'Send email when new user is created', 'boolean', false),
('notifications', 'notification_email_addresses', '[]', 'Admin emails for system notifications', 'array', false),
('notifications', 'daily_summary_enabled', 'false', 'Send daily summary emails', 'boolean', false),
('notifications', 'weekly_report_enabled', 'false', 'Send weekly summary reports', 'boolean', false),

-- API SETTINGS
('api', 'rate_limit_requests', '100', 'API rate limit requests per minute', 'number', false),
('api', 'api_key_expiry_days', '365', 'API key expiry in days', 'number', false),
('api', 'cors_allowed_origins', '["http://localhost:3000"]', 'CORS allowed origins', 'array', false),
('api', 'webhook_secret', '""', 'Webhook secret for external integrations', 'string', false),

-- DASHBOARD SETTINGS
('dashboard', 'default_view', '"overview"', 'Default dashboard view for users', 'string', false),
('dashboard', 'show_weather_widget', 'false', 'Show weather widget on dashboard', 'boolean', true),
('dashboard', 'recent_reports_count', '10', 'Number of recent reports to show', 'number', false),
('dashboard', 'chart_default_period', '"30days"', 'Default period for dashboard charts', 'string', false)

ON CONFLICT (category, key) DO NOTHING;

-- Create a view for easy querying of public settings
CREATE OR REPLACE VIEW public_app_settings AS
SELECT category, key, value, description, data_type, updated_at
FROM app_settings 
WHERE is_public = true AND is_active = true;

-- Create a function to get settings by category
CREATE OR REPLACE FUNCTION get_settings_by_category(category_name TEXT)
RETURNS TABLE(key TEXT, value JSONB, description TEXT, data_type TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        app_settings.key::TEXT,
        app_settings.value,
        app_settings.description,
        app_settings.data_type
    FROM app_settings 
    WHERE app_settings.category = category_name 
    AND app_settings.is_active = true
    ORDER BY app_settings.key;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get all settings grouped by category
CREATE OR REPLACE FUNCTION get_all_settings()
RETURNS TABLE(category TEXT, settings JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        app_settings.category::TEXT,
        jsonb_object_agg(app_settings.key, app_settings.value) as settings
    FROM app_settings 
    WHERE app_settings.is_active = true
    GROUP BY app_settings.category
    ORDER BY app_settings.category;
END;
$$ LANGUAGE plpgsql;

-- Optional: Enable Row Level Security
-- ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Optional: Create policies
-- CREATE POLICY "Allow authenticated read access to app_settings" ON app_settings
-- FOR SELECT USING (auth.role() = 'authenticated' OR is_public = true);

-- CREATE POLICY "Allow admin updates to app_settings" ON app_settings
-- FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE app_settings IS 'Comprehensive application settings storage with category-based organization';
COMMENT ON COLUMN app_settings.category IS 'Setting category (branding, email, system, reports, security, etc.)';
COMMENT ON COLUMN app_settings.key IS 'Unique setting key within category';
COMMENT ON COLUMN app_settings.value IS 'JSON value supporting any data type';
COMMENT ON COLUMN app_settings.is_public IS 'Whether setting can be accessed without authentication';
COMMENT ON COLUMN app_settings.data_type IS 'Expected data type for validation (string, number, boolean, object, array)';

-- Example queries:
-- Get all branding settings: SELECT * FROM get_settings_by_category('branding');
-- Get all settings: SELECT * FROM get_all_settings();
-- Get public settings only: SELECT * FROM public_app_settings; 