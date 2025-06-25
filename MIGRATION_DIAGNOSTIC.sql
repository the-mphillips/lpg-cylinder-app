-- =====================================================
-- MIGRATION DIAGNOSTIC SCRIPT
-- =====================================================
-- Run this first to understand your current database structure

-- Check what logging tables exist
DO $$
BEGIN
    RAISE NOTICE '=== EXISTING LOGGING TABLES ===';
END $$;

-- Check if system_logs table exists and its structure
SELECT 'system_logs table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'system_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if activity_logs table exists and its structure  
SELECT 'activity_logs table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'activity_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if email_logs table exists and its structure
SELECT 'email_logs table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'email_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check for any enum types that might be used
SELECT 'Custom enum types:' as info;
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%log%' OR t.typname LIKE '%level%'
ORDER BY t.typname, e.enumsortorder;

-- Check sample data from existing tables
SELECT 'Sample system_logs data:' as info;
SELECT * FROM system_logs LIMIT 3;

SELECT 'Sample activity_logs data:' as info;  
SELECT * FROM activity_logs LIMIT 3;

SELECT 'Sample email_logs data:' as info;
SELECT * FROM email_logs LIMIT 3;

-- Count existing records
SELECT 'Record counts:' as info;
SELECT 
    'system_logs' as table_name, 
    COUNT(*) as record_count 
FROM system_logs
UNION ALL
SELECT 
    'activity_logs' as table_name, 
    COUNT(*) as record_count 
FROM activity_logs  
UNION ALL
SELECT 
    'email_logs' as table_name, 
    COUNT(*) as record_count 
FROM email_logs; 