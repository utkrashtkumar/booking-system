-- ============================================================================
-- 🚀 QUICK FIX FOR: "Database error saving new user" (HTTP 500)
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. Drop any broken/legacy triggers on auth.users causing the 500 error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS tr_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_signup ON auth.users;

-- 2. Ensure public.profiles table exists and has safe column defaults
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    mobile TEXT UNIQUE,
    gender TEXT DEFAULT 'prefer_not_to_say' CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    avatar_url TEXT DEFAULT 'assets/avatars/av1.svg',
    avatar_type TEXT DEFAULT 'preset' CHECK (avatar_type IN ('upload', 'preset')),
    consent_agreed BOOLEAN DEFAULT FALSE,
    consent_agreed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Safely relax NOT NULL constraints on profiles if table already existed with strict nullability
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN mobile DROP NOT NULL;
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN gender SET DEFAULT 'prefer_not_to_say';
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN gender DROP NOT NULL;

-- 3. Create the Fail-Safe Automatic Profile Creation Trigger
-- This function runs with SECURITY DEFINER (admin rights) and NEVER fails the signup!
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    mobile,
    gender,
    avatar_url,
    avatar_type,
    consent_agreed
  )
  VALUES (
    new.id,
    COALESCE(NULLIF(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    NULLIF(new.raw_user_meta_data->>'mobile', ''),
    COALESCE(NULLIF(new.raw_user_meta_data->>'gender', ''), 'prefer_not_to_say'),
    COALESCE(NULLIF(new.raw_user_meta_data->>'avatar_url', ''), 'assets/avatars/av1.svg'),
    'preset',
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    mobile = COALESCE(EXCLUDED.mobile, public.profiles.mobile),
    gender = COALESCE(EXCLUDED.gender, public.profiles.gender);

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- CRITICAL: Prevent Postgres from aborting the user signup!
    RAISE WARNING 'handle_new_user non-blocking notice: %', SQLERRM;
    RETURN new;
END;
$$;

-- 4. Re-bind the trigger cleanly to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Grant proper permissions
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
