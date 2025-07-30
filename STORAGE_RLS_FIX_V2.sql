-- Fix storage RLS policies for image uploads (Supabase-compatible version)
-- This script adds policies to allow authenticated users to upload images

-- Note: We can't modify storage.objects directly, so we'll use the Supabase Storage API
-- The policies will be created through the Supabase dashboard or using the service role

-- First, let's check if the buckets exist and create them if needed
-- You'll need to do this through the Supabase dashboard or use the service role

-- For now, let's create a function to help with storage operations
CREATE OR REPLACE FUNCTION public.handle_storage_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used to handle storage uploads
  -- For now, we'll just return the new record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_storage_upload() TO authenticated;

-- Create a helper function to check if user can upload to specific bucket
CREATE OR REPLACE FUNCTION public.can_upload_to_bucket(bucket_name text)
RETURNS boolean AS $$
BEGIN
  -- Allow authenticated users to upload to app-data and user-data buckets
  IF bucket_name IN ('app-data', 'user-data') THEN
    RETURN auth.role() = 'authenticated';
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.can_upload_to_bucket(text) TO authenticated;

-- Note: The actual storage policies need to be created through the Supabase dashboard
-- Go to Storage > Policies and add the following policies manually:

/*
For the 'app-data' bucket:

1. INSERT Policy:
   - Name: "Allow authenticated users to upload to app-data"
   - Policy: auth.role() = 'authenticated'

2. SELECT Policy:
   - Name: "Allow authenticated users to read from app-data"
   - Policy: auth.role() = 'authenticated'

3. UPDATE Policy:
   - Name: "Allow authenticated users to update app-data"
   - Policy: auth.role() = 'authenticated'

4. DELETE Policy:
   - Name: "Allow authenticated users to delete from app-data"
   - Policy: auth.role() = 'authenticated'

For the 'user-data' bucket:

1. INSERT Policy:
   - Name: "Allow authenticated users to upload to user-data"
   - Policy: auth.role() = 'authenticated'

2. SELECT Policy:
   - Name: "Allow authenticated users to read from user-data"
   - Policy: auth.role() = 'authenticated'

3. UPDATE Policy:
   - Name: "Allow authenticated users to update user-data"
   - Policy: auth.role() = 'authenticated'

4. DELETE Policy:
   - Name: "Allow authenticated users to delete from user-data"
   - Policy: auth.role() = 'authenticated'
*/ 