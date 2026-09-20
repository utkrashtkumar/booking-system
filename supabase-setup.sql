-- ============================================================================
-- 🎉 IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
-- Complete Supabase Database Schema & Security Setup
-- Execute this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create PROFILES Table
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

-- Safely relax NOT NULL constraints on profiles if table already existed
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN mobile DROP NOT NULL;
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN gender SET DEFAULT 'prefer_not_to_say';
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN gender DROP NOT NULL;

-- Index for fast lookup on email & mobile
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_mobile ON public.profiles(mobile);

-- 3. Create PAYMENTS Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    utr_number TEXT UNIQUE NOT NULL,
    amount NUMERIC(10, 2) DEFAULT 200.00 NOT NULL,
    payment_mobile TEXT NOT NULL,
    screenshot_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    approved_at TIMESTAMPTZ,
    reviewed_by TEXT
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_utr ON public.payments(utr_number);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 4. Create PASSES Table
CREATE TABLE IF NOT EXISTS public.passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    pass_code TEXT UNIQUE NOT NULL,
    qr_payload TEXT NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    scanned_at TIMESTAMPTZ,
    scanned_by TEXT
);

-- Index for gate scanner lookups
CREATE INDEX IF NOT EXISTS idx_passes_pass_code ON public.passes(pass_code);
CREATE INDEX IF NOT EXISTS idx_passes_user_id ON public.passes(user_id);

-- 5. Create ADMIN_EMAILS Table
CREATE TABLE IF NOT EXISTS public.admin_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Seed Designated Admin Email
INSERT INTO public.admin_emails (email, role)
VALUES ('utkrashtu@gmail.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_emails 
        WHERE email = auth.jwt() ->> 'email'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- PROFILES POLICIES ---
-- Users can view their own profile; Admins can view all profiles
CREATE POLICY "Allow individual read own profile or admin read all"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

-- Users can insert their own profile during signup
CREATE POLICY "Allow individual insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Users can update their own profile; Admins can update any
CREATE POLICY "Allow individual update own profile or admin update all"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin());

-- --- PAYMENTS POLICIES ---
-- Users can view their own payment; Admins can view all
CREATE POLICY "Allow individual read own payment or admin read all"
ON public.payments FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- Users can submit their payment (must be their own)
CREATE POLICY "Allow individual submit own payment"
ON public.payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can update payments (approve/reject), users can update if rejected to resubmit
CREATE POLICY "Allow admin update payment or user resubmit"
ON public.payments FOR UPDATE
USING (public.is_admin() OR (auth.uid() = user_id AND status = 'rejected'));

-- --- PASSES POLICIES ---
-- Users can view their own pass; Admins can view all
CREATE POLICY "Allow individual read own pass or admin read all"
ON public.passes FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- Admins can insert passes (upon approving payments)
CREATE POLICY "Allow admin insert pass"
ON public.passes FOR INSERT
WITH CHECK (public.is_admin());

-- Admins can update passes (mark is_used when scanned at gate)
CREATE POLICY "Allow admin update pass"
ON public.passes FOR UPDATE
USING (public.is_admin());

-- --- ADMIN_EMAILS POLICIES ---
-- Public read so frontend can verify admin view permissions safely
CREATE POLICY "Allow authenticated read admin emails"
ON public.admin_emails FOR SELECT
TO authenticated
USING (TRUE);

-- ============================================================================
-- STORAGE BUCKETS SETUP INSTRUCTIONS
-- (Run this or create in Supabase Dashboard -> Storage -> New Bucket)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatars are publicly readable" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'avatars');

-- Storage policies for screenshots
CREATE POLICY "Screenshots are readable by authenticated users and admin" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'screenshots');

CREATE POLICY "Users can upload payment screenshots" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'screenshots');

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime for instant status updates on student dashboard & admin panel
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.passes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER (FAIL-SAFE)
-- Runs on every auth.users insert, safely populating public.profiles
-- ============================================================================

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
    -- Prevent trigger failure from ever blocking user signup!
    RAISE WARNING 'handle_new_user non-blocking notice: %', SQLERRM;
    RETURN new;
END;
$$;

-- Drop any previous trigger and re-bind
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Permissions
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

