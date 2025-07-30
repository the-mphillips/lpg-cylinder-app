-- USER_CLEANUP_TRIGGER.sql
-- Set up automatic cleanup of user data when users are deleted from Supabase Auth

-- Step 1: Create a function to handle user deletion cleanup
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete user's record from public.users
  DELETE FROM public.users WHERE id = OLD.id;
  
  -- Delete user's signature file from storage if it exists
  -- Note: This requires the storage extension and proper permissions
  -- The file path is stored in the signature column
  IF OLD.raw_user_meta_data ? 'signature' THEN
    -- Extract signature path from user metadata
    PERFORM storage.delete_object(
      'app-data', 
      OLD.raw_user_meta_data->>'signature'
    );
  END IF;
  
  -- Log the user deletion
  INSERT INTO public.audit_logs (
    log_type,
    level,
    action,
    message,
    user_id,
    details
  ) VALUES (
    'auth',
    'INFO',
    'USER_DELETED',
    'User deleted from system',
    OLD.id,
    jsonb_build_object(
      'email', OLD.email,
      'deleted_at', NOW(),
      'user_metadata', OLD.raw_user_meta_data
    )
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger on auth.users DELETE
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_deletion();

-- Step 3: Create a function to handle orphaned data cleanup
-- This can be run manually to clean up any orphaned data
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_user_data()
RETURNS TABLE(
  table_name text,
  records_deleted bigint,
  details text
) AS $$
DECLARE
  orphaned_reports bigint := 0;
  orphaned_audit_logs bigint := 0;
  orphaned_equipment bigint := 0;
BEGIN
  -- Count orphaned reports (reports with user_id not in public.users)
  SELECT COUNT(*) INTO orphaned_reports
  FROM public.reports r
  WHERE r.user_id NOT IN (SELECT id FROM public.users)
     OR r.created_by NOT IN (SELECT id FROM public.users)
     OR (r.updated_by IS NOT NULL AND r.updated_by NOT IN (SELECT id FROM public.users))
     OR (r.approved_by IS NOT NULL AND r.approved_by NOT IN (SELECT id FROM public.users));
  
  -- Count orphaned audit logs
  SELECT COUNT(*) INTO orphaned_audit_logs
  FROM public.audit_logs al
  WHERE al.user_id NOT IN (SELECT id FROM public.users);
  
  -- Count orphaned equipment (if any equipment has user references)
  -- Note: equipment table doesn't currently have user references, but this is for future-proofing
  SELECT COUNT(*) INTO orphaned_equipment
  FROM public.equipment e
  WHERE e.created_by IS NOT NULL AND e.created_by NOT IN (SELECT id FROM public.users);
  
  -- Return the counts
  RETURN QUERY SELECT 
    'orphaned_reports'::text,
    orphaned_reports,
    'Reports with references to deleted users'::text;
  
  RETURN QUERY SELECT 
    'orphaned_audit_logs'::text,
    orphaned_audit_logs,
    'Audit logs with references to deleted users'::text;
  
  RETURN QUERY SELECT 
    'orphaned_equipment'::text,
    orphaned_equipment,
    'Equipment with references to deleted users'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create a function to actually clean up orphaned data
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_data_manual()
RETURNS TABLE(
  table_name text,
  records_deleted bigint,
  details text
) AS $$
DECLARE
  deleted_reports bigint := 0;
  deleted_audit_logs bigint := 0;
  deleted_equipment bigint := 0;
BEGIN
  -- Delete orphaned audit logs
  DELETE FROM public.audit_logs 
  WHERE user_id NOT IN (SELECT id FROM public.users);
  GET DIAGNOSTICS deleted_audit_logs = ROW_COUNT;
  
  -- Set orphaned report user references to NULL (don't delete the reports)
  UPDATE public.reports 
  SET user_id = NULL, created_by = NULL, updated_by = NULL, approved_by = NULL
  WHERE user_id NOT IN (SELECT id FROM public.users)
     OR created_by NOT IN (SELECT id FROM public.users)
     OR (updated_by IS NOT NULL AND updated_by NOT IN (SELECT id FROM public.users))
     OR (approved_by IS NOT NULL AND approved_by NOT IN (SELECT id FROM public.users));
  GET DIAGNOSTICS deleted_reports = ROW_COUNT;
  
  -- Set orphaned equipment user references to NULL (if they exist)
  UPDATE public.equipment 
  SET created_by = NULL
  WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM public.users);
  GET DIAGNOSTICS deleted_equipment = ROW_COUNT;
  
  -- Return the results
  RETURN QUERY SELECT 
    'audit_logs_cleaned'::text,
    deleted_audit_logs,
    'Orphaned audit logs deleted'::text;
  
  RETURN QUERY SELECT 
    'reports_cleaned'::text,
    deleted_reports,
    'Orphaned report user references set to NULL'::text;
  
  RETURN QUERY SELECT 
    'equipment_cleaned'::text,
    deleted_equipment,
    'Orphaned equipment user references set to NULL'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create a function to get user deletion statistics
CREATE OR REPLACE FUNCTION public.get_user_deletion_stats()
RETURNS TABLE(
  total_users bigint,
  active_users bigint,
  inactive_users bigint,
  users_with_signatures bigint,
  users_with_reports bigint
) AS $$
BEGIN
  RETURN QUERY SELECT 
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.users WHERE is_active = true) as active_users,
    (SELECT COUNT(*) FROM public.users WHERE is_active = false) as inactive_users,
    (SELECT COUNT(*) FROM public.users WHERE signature IS NOT NULL AND signature != '') as users_with_signatures,
    (SELECT COUNT(DISTINCT user_id) FROM public.reports WHERE user_id IS NOT NULL) as users_with_reports;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant necessary permissions
-- Make sure the functions can be executed by authenticated users
GRANT EXECUTE ON FUNCTION public.handle_user_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_user_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_data_manual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_deletion_stats() TO authenticated;

-- Step 7: Log the setup
INSERT INTO public.audit_logs (
  log_type,
  level,
  action,
  message,
  details
) VALUES (
  'system',
  'INFO',
  'SYSTEM_SETUP',
  'User cleanup triggers and functions created',
  jsonb_build_object(
    'setup_type', 'user_cleanup',
    'created_at', NOW(),
    'functions_created', ARRAY['handle_user_deletion', 'cleanup_orphaned_user_data', 'cleanup_orphaned_data_manual', 'get_user_deletion_stats'],
    'triggers_created', ARRAY['on_auth_user_deleted']
  )
); 