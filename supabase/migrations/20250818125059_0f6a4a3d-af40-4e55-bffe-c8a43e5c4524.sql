-- Fix security warnings by adding search_path to functions

-- Update can_access_profile function with proper search_path
CREATE OR REPLACE FUNCTION public.can_access_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT profile_user_id = auth.uid() AND auth.uid() IS NOT NULL;
$$;

-- Update sanitize_phone function with proper search_path
CREATE OR REPLACE FUNCTION public.sanitize_phone(phone_input text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
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

-- Update sanitize_profile_data function with proper search_path
CREATE OR REPLACE FUNCTION public.sanitize_profile_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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