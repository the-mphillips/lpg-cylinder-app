-- Step 1: A one-time script to sync the existing user's ID.
-- This finds the user in your public.users table by email and updates its ID
-- to match the ID from the Supabase auth.users table.
UPDATE public.users
SET id = sub.id
FROM (SELECT id, email FROM auth.users) AS sub
WHERE public.users.email = sub.email;

-- Step 2: Create a trigger to automatically sync new users.
-- This function will run every time a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a user with this email already exists in public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
    -- If they exist (e.g., from your old data), update their ID to match the auth ID.
    UPDATE public.users
    SET id = NEW.id
    WHERE email = NEW.email;
  ELSE
    -- If they are a brand new user, insert a new record.
    INSERT INTO public.users (id, email, first_name, last_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
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

-- Step 3: The corrected function to get user role (this will now work).
CREATE OR REPLACE FUNCTION get_my_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role::TEXT FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Re-apply the corrected RLS policies for the equipment table.
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