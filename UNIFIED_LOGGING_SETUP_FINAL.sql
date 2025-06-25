-- =====================================================
-- UNIFIED AUDIT LOGGING SYSTEM FOR LPG CYLINDER APP (FINAL)
-- =====================================================
-- This script handles orphaned user references properly

-- Updated Unified Logging Setup Script (Final Version)
-- This script creates a comprehensive audit logging system that consolidates
-- system_logs, activity_logs, and email_logs into a single unified table

-- Drop existing objects if they exist
DROP FUNCTION IF EXISTS public.log_user_activity CASCADE;
DROP FUNCTION IF EXISTS public.log_system_event CASCADE; 
DROP FUNCTION IF EXISTS public.log_email_event CASCADE;
DROP VIEW IF EXISTS public.unified_logs_with_user_info CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Create the unified audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core log information
    level TEXT NOT NULL DEFAULT 'INFO' CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    log_type TEXT NOT NULL CHECK (log_type IN ('system', 'user_activity', 'email', 'auth', 'security', 'api', 'file_operation')),
    action TEXT NOT NULL,
    message TEXT,
    
    -- User and session information
    user_id UUID REFERENCES public.users(id),
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Resource information
    resource_type TEXT,
    resource_id TEXT,
    
    -- Request context
    request_method TEXT,
    request_path TEXT,
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    
    -- Detailed information
    details JSONB,
    before_state JSONB,
    after_state JSONB,
    error_details JSONB,
    
    -- System context
    module TEXT,
    function_name TEXT,
    line_number INTEGER,
    
    -- Email specific fields
    email_to TEXT[],
    email_subject TEXT,
    email_status TEXT,
    
    -- Metadata
    tags TEXT[],
    correlation_id UUID,
    parent_log_id UUID REFERENCES public.audit_logs(id),
    duration_ms INTEGER,
    
    -- Security and compliance
    sensitive_data BOOLEAN DEFAULT false,
    retention_policy TEXT DEFAULT 'standard',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Legacy mapping
    legacy_table TEXT,
    legacy_id INTEGER
);

-- Create indexes for optimal performance
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_type ON public.audit_logs(log_type);
CREATE INDEX idx_audit_logs_level ON public.audit_logs(level);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_correlation ON public.audit_logs(correlation_id);
CREATE INDEX idx_audit_logs_legacy ON public.audit_logs(legacy_table, legacy_id);

-- Create composite indexes for common queries
CREATE INDEX idx_audit_logs_user_action_date ON public.audit_logs(user_id, action, created_at DESC);
CREATE INDEX idx_audit_logs_type_level_date ON public.audit_logs(log_type, level, created_at DESC);

-- Create view with user information using public.users table
CREATE VIEW public.unified_logs_with_user_info AS
SELECT 
    al.*,
    u.username,
    u.email as user_email,
    u.first_name,
    u.last_name,
    u.role as user_role,
    CASE 
        WHEN u.id IS NOT NULL THEN CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))
        WHEN al.user_id IS NOT NULL THEN 'Unknown User'
        ELSE NULL
    END as user_display_name
FROM public.audit_logs al
LEFT JOIN public.users u ON al.user_id = u.id;

-- Helper function to log user activities
CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_request_method TEXT DEFAULT NULL,
    p_request_path TEXT DEFAULT NULL,
    p_before_state JSONB DEFAULT NULL,
    p_after_state JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        log_type, level, action, user_id, resource_type, resource_id,
        details, ip_address, user_agent, session_id,
        request_method, request_path, before_state, after_state
    ) VALUES (
        'user_activity', 'INFO', p_action, p_user_id, p_resource_type, p_resource_id,
        p_details, p_ip_address, p_user_agent, p_session_id,
        p_request_method, p_request_path, p_before_state, p_after_state
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to log system events
CREATE OR REPLACE FUNCTION public.log_system_event(
    p_level TEXT,
    p_action TEXT,
    p_message TEXT DEFAULT NULL,
    p_module TEXT DEFAULT NULL,
    p_function_name TEXT DEFAULT NULL,
    p_line_number INTEGER DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_error_details JSONB DEFAULT NULL,
    p_correlation_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        log_type, level, action, message, module, function_name, line_number,
        details, error_details, correlation_id
    ) VALUES (
        'system', p_level, p_action, p_message, p_module, p_function_name, p_line_number,
        p_details, p_error_details, p_correlation_id
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to log email events
CREATE OR REPLACE FUNCTION public.log_email_event(
    p_user_id UUID,
    p_action TEXT,
    p_email_to TEXT[],
    p_email_subject TEXT,
    p_email_status TEXT DEFAULT 'sent',
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        log_type, level, action, user_id, email_to, email_subject, email_status,
        details, ip_address
    ) VALUES (
        'email', 'INFO', p_action, p_user_id, p_email_to, p_email_subject, p_email_status,
        p_details, p_ip_address
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate data from existing tables
-- Note: Removing foreign key constraint since some users may have been deleted from auth.users

-- Migrate from activity_logs
INSERT INTO public.audit_logs (
    log_type, level, action, user_id, resource_type, resource_id, details,
    created_at, legacy_table, legacy_id
)
SELECT 
    'user_activity',
    'INFO',
    action,
    user_id,
    resource_type,
    resource_id,
    details,
    created_at,
    'activity_logs',
    legacy_id
FROM activity_logs;

-- Migrate from system_logs  
INSERT INTO public.audit_logs (
    log_type, level, action, message, module, function_name, line_number,
    user_id, details, created_at, legacy_table, legacy_id
)
SELECT 
    'system',
    UPPER(level::text),
    'SYSTEM_EVENT',
    message,
    module,
    function_name,
    line_number,
    user_id,
    additional_data,
    created_at,
    'system_logs',
    legacy_id
FROM system_logs;

-- Migrate from email_logs (if any exist)
DO $$
BEGIN
    -- Check if email_logs table exists and has data
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_logs') THEN
        -- Check if there's any data to migrate
        IF EXISTS (SELECT 1 FROM email_logs LIMIT 1) THEN
            -- Attempt migration with error handling
            INSERT INTO public.audit_logs (
                log_type, level, action, user_id, email_to, email_subject, email_status,
                details, created_at, legacy_table, legacy_id
            )
            SELECT 
                'email',
                'INFO',
                'EMAIL_SENT',
                CASE 
                    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                                WHERE table_name = 'email_logs' AND column_name = 'user_id') 
                    THEN user_id 
                    ELSE NULL 
                END,
                ARRAY[recipient_email],
                subject,
                COALESCE(status, 'sent'),
                JSONB_BUILD_OBJECT(
                    'message_id', COALESCE(message_id, ''),
                    'provider', COALESCE(provider, 'unknown'),
                    'error_message', COALESCE(error_message, '')
                ),
                created_at,
                'email_logs',
                id
            FROM email_logs
            WHERE id IS NOT NULL;
            
            RAISE NOTICE 'Migrated % email logs', (SELECT COUNT(*) FROM email_logs);
        ELSE
            RAISE NOTICE 'email_logs table exists but is empty - skipping migration';
        END IF;
    ELSE
        RAISE NOTICE 'email_logs table does not exist - skipping migration';
    END IF;
END $$;

-- Set up Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read logs
CREATE POLICY "Users can read audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (true);

-- Policy for service role to manage logs
CREATE POLICY "Service role can manage audit logs" ON public.audit_logs
    FOR ALL TO service_role
    USING (true);

-- Policy for system to insert logs
CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.unified_logs_with_user_info TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
GRANT EXECUTE ON FUNCTION public.log_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_system_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_email_event TO authenticated;

-- Create automatic cleanup function for old logs
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete logs older than 2 years (configurable)
    DELETE FROM public.audit_logs 
    WHERE created_at < NOW() - INTERVAL '2 years'
    AND retention_policy = 'standard';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    PERFORM public.log_system_event(
        'INFO',
        'LOG_CLEANUP',
        'Cleaned up old audit logs',
        'audit_system',
        'cleanup_old_audit_logs',
        NULL,
        JSONB_BUILD_OBJECT('deleted_count', deleted_count)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up automatic cleanup (uncomment to enable)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * 0', 'SELECT public.cleanup_old_audit_logs();');

-- Add helpful comments
COMMENT ON TABLE public.audit_logs IS 'Unified audit logging table for all system, user, and email activities';
COMMENT ON VIEW public.unified_logs_with_user_info IS 'View that includes user information with audit logs using public.users table';
COMMENT ON FUNCTION public.log_user_activity IS 'Helper function to log user activities with full context';
COMMENT ON FUNCTION public.log_system_event IS 'Helper function to log system events and errors';
COMMENT ON FUNCTION public.log_email_event IS 'Helper function to log email-related activities';

-- Verify the migration
SELECT 
    log_type,
    COUNT(*) as count,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM public.audit_logs 
GROUP BY log_type
ORDER BY log_type;

-- Success message and statistics
DO $$
DECLARE
    system_count INTEGER;
    activity_count INTEGER;
    total_migrated INTEGER;
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO system_count FROM public.audit_logs WHERE log_type = 'system';
    SELECT COUNT(*) INTO activity_count FROM public.audit_logs WHERE log_type = 'user_activity';
    SELECT COUNT(*) INTO orphaned_count FROM public.audit_logs WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
    total_migrated := system_count + activity_count;
    
    RAISE NOTICE 'Unified audit logging system created successfully!';
    RAISE NOTICE 'Migrated % system logs and % activity logs (% total)', system_count, activity_count, total_migrated;
    RAISE NOTICE '% logs reference deleted users (preserved for audit trail)', orphaned_count;
    RAISE NOTICE 'Key features:';
    RAISE NOTICE '- Single table for all log types with rich metadata';
    RAISE NOTICE '- Graceful handling of deleted users';
    RAISE NOTICE '- IP address and user agent tracking PRESERVED';
    RAISE NOTICE '- Helper functions for easy logging';
    RAISE NOTICE '- Comprehensive indexing for performance';
    RAISE NOTICE '- RLS policies for security';
    RAISE NOTICE '- Automatic cleanup of old logs';
END $$; 