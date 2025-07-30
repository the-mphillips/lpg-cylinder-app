-- Storage RLS Fix using Service Role (run this with service role key)
-- This script requires the service role key to modify storage policies

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload to app-data" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to user-data" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read from app-data" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read from user-data" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update app-data" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update user-data" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete from app-data" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete from user-data" ON storage.objects;

-- Create policy for uploading to app-data bucket (for branding, signatures, etc.)
CREATE POLICY "Allow authenticated users to upload to app-data" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'app-data' AND 
    auth.role() = 'authenticated'
  );

-- Create policy for uploading to user-data bucket (for user signatures)
CREATE POLICY "Allow authenticated users to upload to user-data" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-data' AND 
    auth.role() = 'authenticated'
  );

-- Create policy for reading from app-data bucket
CREATE POLICY "Allow authenticated users to read from app-data" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'app-data' AND 
    auth.role() = 'authenticated'
  );

-- Create policy for reading from user-data bucket
CREATE POLICY "Allow authenticated users to read from user-data" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-data' AND 
    auth.role() = 'authenticated'
  );

-- Create policy for updating files in app-data bucket
CREATE POLICY "Allow authenticated users to update app-data" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'app-data' AND 
    auth.role() = 'authenticated'
  );

-- Create policy for updating files in user-data bucket
CREATE POLICY "Allow authenticated users to update user-data" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-data' AND 
    auth.role() = 'authenticated'
  );

-- Create policy for deleting files from app-data bucket
CREATE POLICY "Allow authenticated users to delete from app-data" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'app-data' AND 
    auth.role() = 'authenticated'
  );

-- Create policy for deleting files from user-data bucket
CREATE POLICY "Allow authenticated users to delete from user-data" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-data' AND 
    auth.role() = 'authenticated'
  ); 