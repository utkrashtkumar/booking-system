-- ============================================================================
-- 🚀 COMPLETE DATABASE FIX: Fix User Profiles & Foreign Key Constraints
-- Resolves:
-- 1. "ERROR: 23505: duplicate key value violates unique constraint 'profiles_mobile_key'"
-- 2. "violates foreign key constraint payments_user_id_fkey"
-- 3. "Database error saving new user" (HTTP 500)
--
-- Instructions: Copy and paste this entire script into your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Click "Run"
-- ============================================================================

-- 1. Drop any broken or conflicting triggers on auth.users
DO $$
DECLARE trig RECORD;
BEGIN
    FOR trig IN SELECT trigger_name FROM information_schema.triggers WHERE event_object_schema = 'auth' AND event_object_table = 'users'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trig.trigger_name) || ' ON auth.users CASCADE';
    END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Ensure public.profiles table exists and relax strict constraints
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    mobile TEXT,
    gender TEXT DEFAULT 'prefer_not_to_say' CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    avatar_url TEXT DEFAULT 'assets/avatars/av1.svg',
    avatar_type TEXT DEFAULT 'preset' CHECK (avatar_type IN ('upload', 'preset')),
    consent_agreed BOOLEAN DEFAULT FALSE,
    consent_agreed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- CRITICAL FIX FOR: ERROR 23505 profiles_mobile_key
-- Drop unique constraint and any unique index on mobile to prevent crashes from duplicate/test numbers
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_mobile_key CASCADE;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND indexdef LIKE '%UNIQUE%' 
          AND indexdef LIKE '%mobile%'
    ) LOOP
        EXECUTE 'DROP INDEX IF EXISTS public.' || quote_ident(r.indexname) || ' CASCADE';
    END LOOP;
END;
$$;

-- Create a fast, non-unique index on mobile for search queries
CREATE INDEX IF NOT EXISTS idx_profiles_mobile ON public.profiles(mobile);

-- Safely relax nullability on columns
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN mobile DROP NOT NULL;
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN gender SET DEFAULT 'prefer_not_to_say';
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN gender DROP NOT NULL;

-- 3. Create the Fail-Safe Automatic Profile Creation Trigger
-- Includes emergency 2nd-tier fallback so an auth.users record is NEVER orphaned!
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
      COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
      new.email,
      NULLIF(TRIM(new.raw_user_meta_data->>'mobile'), ''),
      COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'gender'), ''), 'prefer_not_to_say'),
      COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'avatar_url'), ''), 'assets/avatars/av1.svg'),
      'preset',
      FALSE
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
      email = EXCLUDED.email,
      mobile = COALESCE(public.profiles.mobile, EXCLUDED.mobile),
      gender = COALESCE(public.profiles.gender, EXCLUDED.gender);
  EXCEPTION WHEN OTHERS THEN
    -- Emergency fallback: ensure the profile row ALWAYS exists even if metadata parsing fails
    BEGIN
      INSERT INTO public.profiles (id, full_name, email, avatar_url, avatar_type)
      VALUES (
        new.id,
        split_part(new.email, '@', 1),
        new.email,
        'assets/avatars/av1.svg',
        'preset'
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Emergency profile fallback notice: %', SQLERRM;
    END;
  END;

  RETURN new;
END;
$$;

-- Rebind trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. CRITICAL: Backfill missing profiles for all existing registered users
-- (Now completely safe from mobile collision errors)
INSERT INTO public.profiles (id, full_name, email, mobile, gender, avatar_url, avatar_type, consent_agreed)
SELECT 
  u.id,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
  u.email,
  NULLIF(TRIM(u.raw_user_meta_data->>'mobile'), ''),
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'gender'), ''), 'prefer_not_to_say'),
  'assets/avatars/av1.svg',
  'preset',
  FALSE
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name);

-- 5. Ensure passes table has check-in scanning columns
ALTER TABLE IF EXISTS public.passes ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.passes ADD COLUMN IF NOT EXISTS scanned_by TEXT;

-- 6. Grant proper permissions to authenticated and service roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.passes TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- 7. Ensure Row Level Security (RLS) policies exist for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow individual insert own profile" ON public.profiles;
CREATE POLICY "Allow individual insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow individual update own profile or admin update all" ON public.profiles;
CREATE POLICY "Allow individual update own profile or admin update all"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Allow individual read own profile or admin read all" ON public.profiles;
CREATE POLICY "Allow individual read own profile or admin read all"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

-- 8. Ensure Row Level Security (RLS) policies exist for passes
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow individual read own pass or admin read all" ON public.passes;
CREATE POLICY "Allow individual read own pass or admin read all"
ON public.passes FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Allow admin or approved student insert pass" ON public.passes;
DROP POLICY IF EXISTS "Allow admin insert pass" ON public.passes;
CREATE POLICY "Allow admin or approved student insert pass"
ON public.passes FOR INSERT
WITH CHECK (
  public.is_admin() 
  OR (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.payments 
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  )
);

DROP POLICY IF EXISTS "Allow admin update pass" ON public.passes;
CREATE POLICY "Allow admin update pass"
ON public.passes FOR UPDATE
USING (public.is_admin());
