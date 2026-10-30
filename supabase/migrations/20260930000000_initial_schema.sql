-- ============================================================================
-- BloodConnect 2.0 — Supabase Initial Schema Migration
-- Generated from: SUPABASE_MIGRATION_AUDIT.md (Phase 2A)
-- ============================================================================

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('donor', 'requester', 'hospital', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'suspended', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE donor_availability AS ENUM ('available', 'temporarily_unavailable', 'do_not_disturb');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE request_priority AS ENUM ('EMERGENCY', 'URGENT', 'STANDARD');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('OPEN', 'MATCHING', 'DONOR_RESPONDED', 'HOSPITAL_CONFIRMED', 'FULFILLED', 'CANCELLED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE donation_status AS ENUM ('scheduled', 'arrived', 'completed', 'cancelled', 'no_show');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE inventory_status AS ENUM ('available', 'low', 'critical', 'out_of_stock');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- 2a. Profiles (extends auth.users — linked via id FK)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'donor',
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  verification_status verification_status NOT NULL DEFAULT 'verified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2b. Donor Profiles (1:1 with profiles for users with role='donor')
CREATE TABLE IF NOT EXISTS public.donor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_group TEXT NOT NULL,
  availability_status donor_availability NOT NULL DEFAULT 'available',
  last_donation_date TIMESTAMPTZ,
  donations_completed INT NOT NULL DEFAULT 0 CHECK (donations_completed >= 0),
  reliability_score INT NOT NULL DEFAULT 100 CHECK (reliability_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2c. Blood Banks
CREATE TABLE IF NOT EXISTS public.blood_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  contact TEXT NOT NULL,
  phone TEXT,
  operating_hours TEXT DEFAULT '24/7 Service',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2d. Blood Inventory (per-bank, per-blood-group stock)
CREATE TABLE IF NOT EXISTS public.blood_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_bank_id UUID NOT NULL REFERENCES public.blood_banks(id) ON DELETE CASCADE,
  blood_group TEXT NOT NULL,
  units INT NOT NULL DEFAULT 0 CHECK (units >= 0),
  status inventory_status NOT NULL DEFAULT 'available',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blood_bank_id, blood_group)
);

-- 2e. Blood Requests
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  blood_group TEXT NOT NULL,
  priority request_priority NOT NULL DEFAULT 'STANDARD',
  status request_status NOT NULL DEFAULT 'OPEN',
  hospital TEXT NOT NULL,
  units_needed INT NOT NULL CHECK (units_needed >= 1),
  contact_number TEXT NOT NULL,
  patient_name TEXT,
  city TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2f. Donations
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id TEXT UNIQUE NOT NULL,
  donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_bank_id UUID REFERENCES public.blood_banks(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status donation_status NOT NULL DEFAULT 'scheduled',
  units INT NOT NULL DEFAULT 1 CHECK (units >= 1),
  hospital TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);

-- Donor Profiles
CREATE INDEX IF NOT EXISTS idx_donor_profiles_user_id ON public.donor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_donor_profiles_blood_group ON public.donor_profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_donor_profiles_availability ON public.donor_profiles(availability_status);

-- Blood Banks
CREATE INDEX IF NOT EXISTS idx_blood_banks_city ON public.blood_banks(city);

-- Blood Inventory
CREATE INDEX IF NOT EXISTS idx_blood_inventory_bank_id ON public.blood_inventory(blood_bank_id);

-- Blood Requests
CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON public.blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_priority ON public.blood_requests(priority);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON public.blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_requester_id ON public.blood_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_city ON public.blood_requests(city);

-- Donations
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON public.donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_blood_bank_id ON public.donations(blood_bank_id);

-- ============================================================================
-- 4. UPDATED_AT TRIGGER FUNCTION & TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to every table that has an updated_at column
DROP TRIGGER IF EXISTS trigger_set_updated_at_profiles ON public.profiles;
CREATE TRIGGER trigger_set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_donor_profiles ON public.donor_profiles;
CREATE TRIGGER trigger_set_updated_at_donor_profiles
  BEFORE UPDATE ON public.donor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_blood_banks ON public.blood_banks;
CREATE TRIGGER trigger_set_updated_at_blood_banks
  BEFORE UPDATE ON public.blood_banks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_blood_inventory ON public.blood_inventory;
CREATE TRIGGER trigger_set_updated_at_blood_inventory
  BEFORE UPDATE ON public.blood_inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_blood_requests ON public.blood_requests;
CREATE TRIGGER trigger_set_updated_at_blood_requests
  BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_donations ON public.donations;
CREATE TRIGGER trigger_set_updated_at_donations
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. HANDLE NEW USER SIGNUP — auto-create profile row
--    When a new user signs up via Supabase Auth, this trigger automatically
--    inserts a row into public.profiles using the auth metadata.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, phone, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'donor'),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'city', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate to ensure idempotency
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) — ENABLE ON ALL TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 7a. Profiles
-- ---------------------------------------------------------------------------

-- Any authenticated user can read all profiles (needed for donor search, etc.)
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can insert their own profile row (covers signup edge cases)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 7b. Donor Profiles
-- ---------------------------------------------------------------------------

-- Any authenticated user can view donor profiles (for matching donors)
DROP POLICY IF EXISTS "donor_profiles_select_authenticated" ON public.donor_profiles;
CREATE POLICY "donor_profiles_select_authenticated" ON public.donor_profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Donors can insert their own donor profile
DROP POLICY IF EXISTS "donor_profiles_insert_own" ON public.donor_profiles;
CREATE POLICY "donor_profiles_insert_own" ON public.donor_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Donors can update their own donor profile (availability, etc.)
DROP POLICY IF EXISTS "donor_profiles_update_own" ON public.donor_profiles;
CREATE POLICY "donor_profiles_update_own" ON public.donor_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7c. Blood Banks (public read, admin-only writes)
-- ---------------------------------------------------------------------------

-- Anyone (even anonymous) can view blood banks
DROP POLICY IF EXISTS "blood_banks_select_public" ON public.blood_banks;
CREATE POLICY "blood_banks_select_public" ON public.blood_banks
  FOR SELECT
  USING (true);

-- Only admins can insert blood banks (via service_role or matching admin profile)
DROP POLICY IF EXISTS "blood_banks_insert_admin" ON public.blood_banks;
CREATE POLICY "blood_banks_insert_admin" ON public.blood_banks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Only admins can update blood banks
DROP POLICY IF EXISTS "blood_banks_update_admin" ON public.blood_banks;
CREATE POLICY "blood_banks_update_admin" ON public.blood_banks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 7d. Blood Inventory (public read, admin-only writes)
-- ---------------------------------------------------------------------------

-- Anyone can view inventory levels
DROP POLICY IF EXISTS "blood_inventory_select_public" ON public.blood_inventory;
CREATE POLICY "blood_inventory_select_public" ON public.blood_inventory
  FOR SELECT
  USING (true);

-- Only admins can insert inventory records
DROP POLICY IF EXISTS "blood_inventory_insert_admin" ON public.blood_inventory;
CREATE POLICY "blood_inventory_insert_admin" ON public.blood_inventory
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Only admins can update inventory
DROP POLICY IF EXISTS "blood_inventory_update_admin" ON public.blood_inventory;
CREATE POLICY "blood_inventory_update_admin" ON public.blood_inventory
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 7e. Blood Requests
-- ---------------------------------------------------------------------------

-- Authenticated users can view all blood requests
DROP POLICY IF EXISTS "blood_requests_select_authenticated" ON public.blood_requests;
CREATE POLICY "blood_requests_select_authenticated" ON public.blood_requests
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can create blood requests
DROP POLICY IF EXISTS "blood_requests_insert_authenticated" ON public.blood_requests;
CREATE POLICY "blood_requests_insert_authenticated" ON public.blood_requests
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Requesters can update their own requests (status changes, etc.)
DROP POLICY IF EXISTS "blood_requests_update_own" ON public.blood_requests;
CREATE POLICY "blood_requests_update_own" ON public.blood_requests
  FOR UPDATE
  USING (auth.uid() = requester_id);

-- ---------------------------------------------------------------------------
-- 7f. Donations
-- ---------------------------------------------------------------------------

-- Donors can view their own donations
DROP POLICY IF EXISTS "donations_select_own" ON public.donations;
CREATE POLICY "donations_select_own" ON public.donations
  FOR SELECT
  USING (auth.uid() = donor_id);

-- Admins can view all donations (for dashboards)
DROP POLICY IF EXISTS "donations_select_admin" ON public.donations;
CREATE POLICY "donations_select_admin" ON public.donations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Donors can create donations for themselves
DROP POLICY IF EXISTS "donations_insert_own" ON public.donations;
CREATE POLICY "donations_insert_own" ON public.donations
  FOR INSERT
  WITH CHECK (auth.uid() = donor_id);

-- Donors can update their own donations (e.g., cancel)
DROP POLICY IF EXISTS "donations_update_own" ON public.donations;
CREATE POLICY "donations_update_own" ON public.donations
  FOR UPDATE
  USING (auth.uid() = donor_id);
