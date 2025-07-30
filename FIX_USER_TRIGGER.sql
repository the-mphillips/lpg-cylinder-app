-- FIX_USER_TRIGGER.sql
-- Fix the user trigger to properly handle the role enum type

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

-- Create the corrected trigger function
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
      -- Cast the role to the correct enum type, defaulting to 'Tester' if not specified
      COALESCE(
        (NEW.raw_user_meta_data ->> 'role')::public.user_role_new,
        'Tester'::public.user_role_new
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user(); 