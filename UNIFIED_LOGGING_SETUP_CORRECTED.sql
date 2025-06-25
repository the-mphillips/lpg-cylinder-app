-- =====================================================
-- UNIFIED AUDIT LOGGING SYSTEM FOR LPG CYLINDER APP (CORRECTED)
-- =====================================================
-- This script creates a comprehensive audit logging system based on the actual table structure

-- Step 1: Create the unified audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Timing information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Log categorization
    log_type VARCHAR(20) NOT NULL CHECK (log_type IN ('system', 'user_activity', 'email', 'auth', 'security', 'api', 'file_operation')),
    level VARCHAR(10) NOT NULL DEFAULT 'INFO' CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    action VARCHAR(100) NOT NULL, -- What happened (login, logout, settings_update, file_upload, etc.)
    
    -- User and session information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    session_id VARCHAR(255),
    
    -- Request/Network information
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    request_headers JSONB,
    
    -- Resource information
    resource_type VARCHAR(50), -- table/entity affected (users, reports, settings, etc.)
    resource_id VARCHAR(100),  -- ID of the affected resource
    resource_name VARCHAR(255), -- Human readable name of resource
    
    -- Event details
    message TEXT NOT NULL, -- Brief human-readable description
    details JSONB, -- Full event details, old/new values, etc.
    
    -- Additional metadata
    module VARCHAR(50), -- Which part of app generated the log
    correlation_id UUID, -- For tracking related events
    tenant_id UUID, -- For multi-tenancy (future use)
    
    -- Status and flags
    is_sensitive BOOLEAN DEFAULT FALSE, -- Contains PII or sensitive data
    is_system_generated BOOLEAN DEFAULT FALSE, -- Auto vs manual log
    retention_days INTEGER DEFAULT 365 -- How long to keep this log
);

-- Step 2: Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_log_type ON audit_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id) WHERE resource_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs(correlation_id) WHERE correlation_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_activity ON audit_logs(user_id, created_at DESC) WHERE log_type = 'user_activity';
CREATE INDEX IF NOT EXISTS idx_audit_logs_system_errors ON audit_logs(level, created_at DESC) WHERE level IN ('ERROR', 'CRITICAL');
CREATE INDEX IF NOT EXISTS idx_audit_logs_search ON audit_logs USING GIN (to_tsvector('english', message || ' ' || COALESCE(details::text, '')));

-- Step 3: Create a view for easy querying with user information
CREATE OR REPLACE VIEW audit_logs_with_users AS
SELECT 
    al.*,
    u.raw_user_meta_data->>'full_name' as full_name,
    u.raw_user_meta_data->>'avatar_url' as avatar_url,
    u.created_at as user_created_at,
    CASE 
        WHEN al.user_id IS NOT NULL THEN 'authenticated'
        ELSE 'anonymous'
    END as user_status
FROM audit_logs al
LEFT JOIN auth.users u ON al.user_id = u.id;

-- Step 4: Create helper functions for common operations

-- Function to log user activities
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_message TEXT,
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id VARCHAR(100) DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_level VARCHAR(10) DEFAULT 'INFO'
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
    user_info RECORD;
BEGIN
    -- Get user information
    SELECT 
        email,
        raw_user_meta_data->>'full_name' as full_name,
        raw_user_meta_data->>'role' as role
    INTO user_info
    FROM auth.users 
    WHERE id = p_user_id;
    
    -- Insert log entry
    INSERT INTO audit_logs (
        log_type, level, action, message,
        user_id, user_email, user_name, user_role,
        resource_type, resource_id, details,
        ip_address, user_agent, is_system_generated
    ) VALUES (
        'user_activity', p_level, p_action, p_message,
        p_user_id, user_info.email, user_info.full_name, user_info.role,
        p_resource_type, p_resource_id, p_details,
        p_ip_address, p_user_agent, FALSE
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log system events
CREATE OR REPLACE FUNCTION log_system_event(
    p_level VARCHAR(10),
    p_message TEXT,
    p_module VARCHAR(50) DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_action VARCHAR(100) DEFAULT 'system_event'
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        log_type, level, action, message, module, details, is_system_generated
    ) VALUES (
        'system', p_level, p_action, p_message, p_module, p_details, TRUE
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log email events
CREATE OR REPLACE FUNCTION log_email_event(
    p_action VARCHAR(100),
    p_message TEXT,
    p_recipient VARCHAR(255),
    p_subject TEXT DEFAULT NULL,
    p_status VARCHAR(20) DEFAULT 'sent',
    p_details JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
    user_info RECORD;
BEGIN
    -- Get user information if provided
    IF p_user_id IS NOT NULL THEN
        SELECT 
            email,
            raw_user_meta_data->>'full_name' as full_name,
            raw_user_meta_data->>'role' as role
        INTO user_info
        FROM auth.users 
        WHERE id = p_user_id;
    END IF;
    
    -- Enhance details with email information
    p_details = COALESCE(p_details, '{}'::jsonb) || jsonb_build_object(
        'recipient', p_recipient,
        'subject', p_subject,
        'status', p_status
    );
    
    INSERT INTO audit_logs (
        log_type, level, action, message,
        user_id, user_email, user_name, user_role,
        resource_type, details, is_system_generated
    ) VALUES (
        'email', 'INFO', p_action, p_message,
        p_user_id, user_info.email, user_info.full_name, user_info.role,
        'email', p_details, FALSE
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create cleanup function for old logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    PERFORM log_system_event('INFO', 
        format('Cleaned up %s old audit log entries', deleted_count),
        'system_maintenance'
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Migrate existing data with proper handling of actual table structure

-- Migrate system_logs (9 records)
INSERT INTO audit_logs (
    created_at, log_type, level, action, message, module, is_system_generated, user_id, details
)
SELECT 
    created_at,
    'system',
    UPPER(level::text), -- Cast enum to text first, then upper case
    'system_event',
    message,
    module,
    TRUE,
    user_id, -- Keep the user_id if it exists
    CASE 
        WHEN additional_data IS NOT NULL AND additional_data != '{}'::jsonb 
        THEN additional_data 
        ELSE NULL 
    END
FROM system_logs
WHERE NOT EXISTS (
    SELECT 1 FROM audit_logs al 
    WHERE al.created_at = system_logs.created_at 
    AND al.message = system_logs.message
);

-- Migrate activity_logs (222 records) - these already have user_id, ip_address, user_agent!
INSERT INTO audit_logs (
    created_at, log_type, level, action, message,
    user_id, resource_type, resource_id, details, 
    ip_address, user_agent, is_system_generated
)
SELECT 
    al.created_at,
    'user_activity',
    'INFO',
    al.action,
    COALESCE(al.details->>'message', al.action, 'User activity'),
    al.user_id,
    al.resource_type,
    al.resource_id,
    al.details,
    al.ip_address, -- This was already captured!
    al.user_agent, -- This was already captured!
    FALSE
FROM activity_logs al
WHERE NOT EXISTS (
    SELECT 1 FROM audit_logs aul 
    WHERE aul.user_id = al.user_id 
    AND aul.created_at = al.created_at 
    AND aul.action = al.action
);

-- Update user information for migrated records (populate email, name, role from auth.users)
UPDATE audit_logs 
SET 
    user_email = u.email,
    user_name = u.raw_user_meta_data->>'full_name',
    user_role = u.raw_user_meta_data->>'role'
FROM auth.users u 
WHERE audit_logs.user_id = u.id 
AND (audit_logs.user_email IS NULL OR audit_logs.user_name IS NULL);

-- Step 7: Create RLS policies for security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own activity logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'super_admin' OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- Allow system to insert logs
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Admins can view all logs
CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'super_admin' OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- Step 8: Create summary statistics view
CREATE OR REPLACE VIEW audit_log_statistics AS
SELECT 
    log_type,
    level,
    DATE(created_at) as log_date,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY log_type, level, DATE(created_at)
ORDER BY log_date DESC, log_type;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Unified audit logging system for all application events';
COMMENT ON COLUMN audit_logs.log_type IS 'Category of log: system, user_activity, email, auth, security, api, file_operation';
COMMENT ON COLUMN audit_logs.level IS 'Log severity: DEBUG, INFO, WARNING, ERROR, CRITICAL';
COMMENT ON COLUMN audit_logs.action IS 'Specific action that occurred';
COMMENT ON COLUMN audit_logs.details IS 'JSON object with full event details including old/new values';
COMMENT ON COLUMN audit_logs.correlation_id IS 'Links related events together';
COMMENT ON COLUMN audit_logs.is_sensitive IS 'Flags logs containing PII or sensitive data';

-- Success message
DO $$
DECLARE
    system_count INTEGER;
    activity_count INTEGER;
    total_migrated INTEGER;
BEGIN
    SELECT COUNT(*) INTO system_count FROM audit_logs WHERE log_type = 'system';
    SELECT COUNT(*) INTO activity_count FROM audit_logs WHERE log_type = 'user_activity';
    total_migrated := system_count + activity_count;
    
    RAISE NOTICE 'Unified audit logging system created successfully!';
    RAISE NOTICE 'Migrated % system logs and % activity logs (% total)', system_count, activity_count, total_migrated;
    RAISE NOTICE 'Key features:';
    RAISE NOTICE '- Single table for all log types with rich metadata';
    RAISE NOTICE '- User information automatically populated';
    RAISE NOTICE '- IP address and user agent tracking PRESERVED from activity_logs';
    RAISE NOTICE '- Helper functions for easy logging';
    RAISE NOTICE '- Comprehensive indexing for performance';
    RAISE NOTICE '- RLS policies for security';
    RAISE NOTICE '- Automatic cleanup of old logs';
END $$; 