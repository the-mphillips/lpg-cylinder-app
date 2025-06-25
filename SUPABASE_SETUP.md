# Supabase Setup Instructions

## Storage Bucket Policies

To fix the "new row violates row-level security policy" error when uploading files, you need to set up proper RLS policies for your storage buckets.

### Required Buckets

Your Supabase project should have these buckets:
- `app-data` - For branding images (public)
- `user-data` - For user signatures and reports (private)

### RLS Policies to Add

Run these SQL commands in your Supabase SQL Editor:

#### 1. Enable RLS on storage.objects (if not already enabled)
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

#### 2. Policy for app-data bucket (branding images)
```sql
-- Allow authenticated users to upload to app-data bucket
CREATE POLICY "Allow authenticated uploads to app-data" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'app-data'
);

-- Allow public read access to app-data bucket
CREATE POLICY "Allow public read access to app-data" ON storage.objects
FOR SELECT USING (bucket_id = 'app-data');

-- Allow authenticated users to update their own uploads in app-data
CREATE POLICY "Allow authenticated updates to app-data" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'app-data'
);

-- Allow authenticated users to delete from app-data
CREATE POLICY "Allow authenticated deletes from app-data" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'app-data'
);
```

#### 3. Policy for user-data bucket (signatures and reports)
```sql
-- Allow authenticated users to upload to user-data bucket
CREATE POLICY "Allow authenticated uploads to user-data" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'user-data'
);

-- Allow authenticated users to read their own files in user-data
CREATE POLICY "Allow authenticated read access to user-data" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'user-data'
);

-- Allow authenticated users to update their own files in user-data
CREATE POLICY "Allow authenticated updates to user-data" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'user-data'
);

-- Allow authenticated users to delete their own files in user-data
CREATE POLICY "Allow authenticated deletes from user-data" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'user-data'
);
```

### Alternative: Disable RLS (Less Secure)

If you want to quickly test uploads without setting up detailed policies:

```sql
-- Disable RLS for storage.objects (NOT RECOMMENDED for production)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

### Bucket Configuration

Make sure your buckets are configured correctly:

#### app-data bucket:
- Public: Yes
- File size limit: 50MB
- Allowed MIME types: image/jpeg, image/png, image/svg+xml, image/webp

#### user-data bucket:
- Public: No
- File size limit: 50MB  
- Allowed MIME types: image/jpeg, image/png, image/svg+xml, application/pdf

### Authentication Setup

Ensure your app is properly authenticating users with Supabase Auth before attempting uploads. The upload functions now check for authentication and will return appropriate error messages if the user is not authenticated.

### Testing

After setting up the policies:

1. Go to `/admin/branding` in your app
2. Click "Check Storage Buckets" to verify connectivity
3. Try uploading a logo file
4. Try uploading a signature with user selection

If you still get RLS errors, check the Supabase dashboard logs for more specific error details. 