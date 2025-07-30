-- FIX_USER_TRIGGER_V2.sql
-- Fix the user trigger by making password_hash nullable and updating the trigger

-- Step 1: Make password_hash column nullable (since we're using Supabase Auth)
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

-- Step 2: Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

-- Step 3: Create the corrected trigger function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
    -- Update existing user's ID to match auth.users
    UPDATE public.users SET id = NEW.id WHERE email = NEW.email;
  ELSE
    -- Insert new user without password_hash (using Supabase Auth)
    INSERT INTO public.users (
      id, 
      email, 
      first_name, 
      last_name, 
      username, 
      role,
      password_hash  -- This will be NULL since we're using Supabase Auth
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
      -- Cast the role to the correct enum type, defaulting to 'Tester' if not specified
      COALESCE(
        (NEW.raw_user_meta_data ->> 'role')::public.user_role_new,
        'Tester'::public.user_role_new
      ),
      NULL  -- No password hash since we're using Supabase Auth
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Re-create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user(); 