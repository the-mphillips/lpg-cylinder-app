-- Step 1: Clean up orphaned records in audit_logs and reports.
-- This finds records that point to a user ID that no longer exists in public.users
-- and sets the user ID to NULL to preserve the record while fixing the broken link.
UPDATE public.audit_logs SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
UPDATE public.reports SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
UPDATE public.reports SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM public.users);
UPDATE public.reports SET updated_by = NULL WHERE updated_by IS NOT NULL AND updated_by NOT IN (SELECT id FROM public.users);
UPDATE public.reports SET approved_by = NULL WHERE approved_by IS NOT NULL AND approved_by NOT IN (SELECT id FROM public.users);
UPDATE public.reports SET deleted_by = NULL WHERE deleted_by IS NOT NULL AND deleted_by NOT IN (SELECT id FROM public.users);

-- Step 2: Safely update all foreign key constraints to allow for ID synchronization.
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_approved_by_fkey;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_created_by_fkey;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_deleted_by_fkey;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_updated_by_fkey;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_user_id_fkey;

-- Step 3: A one-time script to sync the existing user's ID.
UPDATE public.users
SET id = sub.id
FROM (SELECT id, email FROM auth.users) AS sub
WHERE public.users.email = sub.email;

-- Step 4: Re-create all foreign key constraints with ON UPDATE CASCADE.
ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.reports
ADD CONSTRAINT reports_approved_by_fkey
FOREIGN KEY (approved_by)
REFERENCES public.users(id)
ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.reports
ADD CONSTRAINT reports_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES public.users(id)
ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.reports
ADD CONSTRAINT reports_deleted_by_fkey
FOREIGN KEY (deleted_by)
REFERENCES public.users(id)
ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.reports
ADD CONSTRAINT reports_updated_by_fkey
FOREIGN KEY (updated_by)
REFERENCES public.users(id)
ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.reports
ADD CONSTRAINT reports_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON UPDATE CASCADE ON DELETE SET NULL;

-- Step 5: Clean up the incorrect user_profiles table and triggers that were created by mistake.
DROP TABLE IF EXISTS public.user_profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 6: Create a trigger to automatically sync new users with your existing public.users table.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
    UPDATE public.users SET id = NEW.id WHERE email = NEW.email;
  ELSE
    INSERT INTO public.users (id, email, first_name, last_name, username, role)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      NEW.raw_user_meta_data ->> 'username',
      NEW.raw_user_meta_data ->> 'role'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger that executes the function
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Step 7: The corrected function to get user role (this will now work).
CREATE OR REPLACE FUNCTION get_my_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role::TEXT FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Re-apply the corrected RLS policies for the equipment table.
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read equipment" ON equipment;
CREATE POLICY "Allow authenticated users to read equipment"
ON equipment FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow Admins to insert equipment" ON equipment;
CREATE POLICY "Allow Admins to insert equipment"
ON equipment FOR INSERT TO authenticated WITH CHECK (get_my_user_role() IN ('Admin', 'Super Admin'));

DROP POLICY IF EXISTS "Allow Admins to update equipment" ON equipment;
CREATE POLICY "Allow Admins to update equipment"
ON equipment FOR UPDATE TO authenticated USING (get_my_user_role() IN ('Admin', 'Super Admin'));

DROP POLICY IF EXISTS "Allow Admins to delete equipment" ON equipment;
CREATE POLICY "Allow Admins to delete equipment"
ON equipment FOR DELETE TO authenticated USING (get_my_user_role() IN ('Admin', 'Super Admin')); 