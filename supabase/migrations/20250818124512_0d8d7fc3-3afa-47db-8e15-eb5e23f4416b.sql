-- Enhanced security for profiles table
-- Create a security definer function to validate profile access
CREATE OR REPLACE FUNCTION public.can_access_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT profile_user_id = auth.uid() AND auth.uid() IS NOT NULL;
$$;

-- Create a function to sanitize phone numbers before storage
CREATE OR REPLACE FUNCTION public.sanitize_phone(phone_input text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove all non-digit characters except + at the beginning
  IF phone_input IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Basic phone number sanitization
  RETURN regexp_replace(phone_input, '[^\d+]', '', 'g');
END;
$$;

-- Add a trigger to sanitize phone numbers on insert/update
CREATE OR REPLACE FUNCTION public.sanitize_profile_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sanitize phone number
  IF NEW.phone IS NOT NULL THEN
    NEW.phone = public.sanitize_phone(NEW.phone);
  END IF;
  
  -- Ensure user_id cannot be changed
  IF TG_OP = 'UPDATE' AND OLD.user_id != NEW.user_id THEN
    RAISE EXCEPTION 'Cannot change user_id';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sanitize_profile_trigger ON public.profiles;

-- Create the sanitization trigger
CREATE TRIGGER sanitize_profile_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_profile_data();

-- Drop existing policies to recreate them with enhanced security
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Recreate policies with enhanced security using the security definer function
CREATE POLICY "Enhanced: Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.can_access_profile(user_id));

CREATE POLICY "Enhanced: Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_profile(user_id));

CREATE POLICY "Enhanced: Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.can_access_profile(user_id))
  WITH CHECK (public.can_access_profile(user_id));

CREATE POLICY "Enhanced: Users can delete own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.can_access_profile(user_id));

-- Add additional constraint to ensure user_id is not null
ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;

-- Add comment for security documentation
COMMENT ON TABLE public.profiles IS 'User profile data with enhanced RLS security. Only authenticated users can access their own profile data.';
COMMENT ON FUNCTION public.can_access_profile(uuid) IS 'Security definer function to validate profile access permissions';
COMMENT ON FUNCTION public.sanitize_phone(text) IS 'Sanitizes phone number input for security';
COMMENT ON FUNCTION public.sanitize_profile_data() IS 'Trigger function to sanitize and validate profile data before storage';