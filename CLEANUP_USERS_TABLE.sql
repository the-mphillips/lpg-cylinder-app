-- CLEANUP_USERS_TABLE.sql
-- Clean up the public.users table by removing redundant authentication columns

-- Step 1: Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

-- Step 2: Remove redundant authentication columns
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.users DROP COLUMN IF EXISTS reset_password_token;
ALTER TABLE public.users DROP COLUMN IF EXISTS reset_password_expire;
ALTER TABLE public.users DROP COLUMN IF EXISTS last_login_at;

-- Step 3: Create the simplified trigger function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
    -- Update existing user's ID to match auth.users
    UPDATE public.users SET id = NEW.id WHERE email = NEW.email;
  ELSE
    -- Insert new user with only business logic fields
    INSERT INTO public.users (
      id, 
      email, 
      first_name, 
      last_name, 
      username, 
      role,
      is_active,
      phone,
      department,
      signature
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
      true, -- is_active defaults to true
      NEW.raw_user_meta_data ->> 'phone',
      NEW.raw_user_meta_data ->> 'department',
      NEW.raw_user_meta_data ->> 'signature'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Re-create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Step 5: Verify the cleaned up table structure
-- The table should now only contain business logic fields 