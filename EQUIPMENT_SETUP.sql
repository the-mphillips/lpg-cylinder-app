-- Create the equipment table if it doesn't exist
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    cost_price NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row modification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_timestamp_equipment' AND tgrelid = 'equipment'::regclass
    ) THEN
        CREATE TRIGGER set_timestamp_equipment
        BEFORE UPDATE ON equipment
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END
$$;

-- Function to get a specific claim from the JWT
CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)
RETURNS JSONB AS $$
BEGIN
    RETURN (auth.jwt() -> 'app_metadata' -> claim);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a user_profiles table to store public user data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'Tester'
);

-- Function to create a public profile for each new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, role)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username', NEW.raw_user_meta_data ->> 'role');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create a profile when a new user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get the user role from the public.users table
CREATE OR REPLACE FUNCTION get_my_user_role()
RETURNS TEXT AS $$
BEGIN
  -- The user's ID is available in the auth.uid() function
  RETURN (SELECT role::TEXT FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for equipment table
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read equipment" ON equipment;
CREATE POLICY "Allow authenticated users to read equipment"
ON equipment
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow Admins to insert equipment" ON equipment;
CREATE POLICY "Allow Admins to insert equipment"
ON equipment
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_user_role() IN ('Admin', 'Super Admin')
);

DROP POLICY IF EXISTS "Allow Admins to update equipment" ON equipment;
CREATE POLICY "Allow Admins to update equipment"
ON equipment
FOR UPDATE
TO authenticated
USING (
  get_my_user_role() IN ('Admin', 'Super Admin')
)
WITH CHECK (
  get_my_user_role() IN ('Admin', 'Super Admin')
);

DROP POLICY IF EXISTS "Allow Admins to delete equipment" ON equipment;
CREATE POLICY "Allow Admins to delete equipment"
ON equipment
FOR DELETE
TO authenticated
USING (
  get_my_user_role() IN ('Admin', 'Super Admin')
);

-- Policies for user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow individual read access" ON public.user_profiles;
CREATE POLICY "Allow individual read access"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow individual update access" ON public.user_profiles;
CREATE POLICY "Allow individual update access"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id);
