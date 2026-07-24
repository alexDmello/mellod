-- ============================================================
-- MELLOD UCO COLLECTION APP — SUPABASE SQL SCHEMA
-- Run this in the Supabase SQL Editor (Database > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- STEP 1: CREATE ALL TABLES FIRST
-- (RLS policies that reference other tables come after)
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'sub_admin', 'picker', 'fbo')),
  username    TEXT UNIQUE NOT NULL,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. FBOS (Food & Beverage Operators / Collection Points)
CREATE TABLE public.fbos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  address       TEXT,
  contact_person TEXT,
  phone         TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  latitude      NUMERIC(9, 6),
  longitude     NUMERIC(9, 6),
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. PICKERS (Collection drivers/staff)
CREATE TABLE public.pickers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_info TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. DAILY PRICES (Admin-set market price per liter)
CREATE TABLE public.daily_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_liter NUMERIC(10, 2) NOT NULL CHECK (price_per_liter > 0),
  currency        TEXT DEFAULT 'INR',
  set_by          UUID REFERENCES public.profiles(id),
  effective_from  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. ROUTES (Daily picker → FBO assignments)
CREATE TABLE public.routes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  picker_id    UUID REFERENCES public.pickers(id) ON DELETE CASCADE NOT NULL,
  fbo_id       UUID REFERENCES public.fbos(id) ON DELETE CASCADE NOT NULL,
  route_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (picker_id, fbo_id, route_date)
);

-- 6. PICKUPS (Core transaction table)
CREATE TABLE public.pickups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  picker_id       UUID REFERENCES public.pickers(id) NOT NULL,
  fbo_id          UUID REFERENCES public.fbos(id) NOT NULL,
  route_id        UUID REFERENCES public.routes(id),
  liters          NUMERIC(10, 2) NOT NULL CHECK (liters > 0),
  price_per_liter NUMERIC(10, 2) NOT NULL,
  total_amount    NUMERIC(10, 2) GENERATED ALWAYS AS (liters * price_per_liter) STORED,
  photo_url       TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'disputed')),
  picked_up_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. PAYMENT METHODS (FBO bank/UPI details)
CREATE TABLE public.payment_methods (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fbo_id         UUID REFERENCES public.fbos(id) ON DELETE CASCADE NOT NULL,
  method_type    TEXT NOT NULL CHECK (method_type IN ('bank', 'upi', 'cash')),
  -- Bank fields
  account_holder TEXT,
  bank_name      TEXT,
  account_number TEXT,
  ifsc_code      TEXT,
  -- UPI field
  upi_id         TEXT,
  is_primary     BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. ROUTE DEFINITIONS (Templates for grouping FBOs together with a default picker)
CREATE TABLE public.route_definitions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL UNIQUE,
  default_picker_id  UUID REFERENCES public.pickers(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. ROUTE STOPS (FBOs assigned to a route template with sequence ordering)
CREATE TABLE public.route_stops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_definition_id UUID REFERENCES public.route_definitions(id) ON DELETE CASCADE NOT NULL,
  fbo_id              UUID REFERENCES public.fbos(id) ON DELETE CASCADE NOT NULL,
  sort_order          INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (route_definition_id, fbo_id)
);

-- 10. SUB-ADMIN PERMISSIONS (Granular route access for sub-admins)
CREATE TABLE public.sub_admin_permissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  allowed_routes TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fbos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_prices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickups                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_definitions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_admin_permissions  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'sub_admin')
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 4: RLS POLICIES
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT USING (
    public.is_admin() OR id = auth.uid()
  );

CREATE POLICY "Admins insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    public.is_admin()
  );

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- ── fbos ─────────────────────────────────────────────────────
CREATE POLICY "Admins manage fbos" ON public.fbos
  FOR ALL USING (
    public.is_admin()
  );

-- NOTE: public.routes now exists, so this cross-table policy is safe
CREATE POLICY "Pickers read assigned fbos" ON public.fbos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.routes r
      JOIN public.pickers pk ON pk.id = r.picker_id
      WHERE r.fbo_id = fbos.id
        AND pk.profile_id = auth.uid()
        AND r.route_date = CURRENT_DATE
    )
  );

CREATE POLICY "FBOs read own record" ON public.fbos
  FOR SELECT USING (profile_id = auth.uid());

-- ── pickers ──────────────────────────────────────────────────
CREATE POLICY "Admins manage pickers" ON public.pickers
  FOR ALL USING (
    public.is_admin()
  );

CREATE POLICY "Pickers read own record" ON public.pickers
  FOR SELECT USING (profile_id = auth.uid());

-- ── daily_prices ─────────────────────────────────────────────
CREATE POLICY "Admins manage prices" ON public.daily_prices
  FOR ALL USING (
    public.is_admin()
  );

CREATE POLICY "All authenticated users read prices" ON public.daily_prices
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── routes ───────────────────────────────────────────────────
CREATE POLICY "Admins manage routes" ON public.routes
  FOR ALL USING (
    public.is_admin()
  );

CREATE POLICY "Pickers read own routes" ON public.routes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pickers pk
      WHERE pk.id = routes.picker_id AND pk.profile_id = auth.uid()
    )
  );

-- ── pickups ──────────────────────────────────────────────────
CREATE POLICY "Admins manage pickups" ON public.pickups
  FOR ALL USING (
    public.is_admin()
  );

CREATE POLICY "Pickers insert own pickups" ON public.pickups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pickers pk
      WHERE pk.id = pickups.picker_id AND pk.profile_id = auth.uid()
    )
  );

CREATE POLICY "Pickers read own pickups" ON public.pickups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pickers pk
      WHERE pk.id = pickups.picker_id AND pk.profile_id = auth.uid()
    )
  );

CREATE POLICY "FBOs read own pickups" ON public.pickups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fbos f
      WHERE f.id = pickups.fbo_id AND f.profile_id = auth.uid()
    )
  );

-- ── payment_methods ──────────────────────────────────────────
CREATE POLICY "Admins manage payment methods" ON public.payment_methods
  FOR ALL USING (
    public.is_admin()
  );

CREATE POLICY "FBOs manage own payment methods" ON public.payment_methods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.fbos f
      WHERE f.id = payment_methods.fbo_id AND f.profile_id = auth.uid()
    )
  );

-- ── route_definitions ─────────────────────────────────────────
CREATE POLICY "Admins manage route definitions" ON public.route_definitions
  FOR ALL USING (
    public.is_admin()
  );

CREATE POLICY "Authenticated users read route definitions" ON public.route_definitions
  FOR SELECT TO authenticated USING (
    true
  );

-- ── route_stops ───────────────────────────────────────────────
CREATE POLICY "Admins manage route stops" ON public.route_stops
  FOR ALL USING (
    public.is_admin()
  );

CREATE POLICY "Authenticated users read route stops" ON public.route_stops
  FOR SELECT TO authenticated USING (
    true
  );

-- ── sub_admin_permissions ──────────────────────────────────────
CREATE POLICY "Admins manage sub_admin_permissions" ON public.sub_admin_permissions
  FOR ALL USING (
    public.is_admin()
  );

CREATE POLICY "Sub admins read own permissions" ON public.sub_admin_permissions
  FOR SELECT USING (
    profile_id = auth.uid()
  );

-- ============================================================
-- STEP 4: VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.fbo_stats AS
  SELECT
    f.id AS fbo_id,
    f.business_name,
    f.profile_id,
    COALESCE(SUM(p.liters), 0)      AS total_liters,
    COALESCE(SUM(p.total_amount), 0) AS total_earnings,
    COUNT(p.id)                      AS total_pickups,
    MAX(p.picked_up_at)              AS last_pickup_at
  FROM public.fbos f
  LEFT JOIN public.pickups p ON p.fbo_id = f.id AND p.status = 'completed'
  GROUP BY f.id, f.business_name, f.profile_id;

-- ============================================================
-- STEP 5: UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at              BEFORE UPDATE ON public.profiles              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_fbos_updated_at                  BEFORE UPDATE ON public.fbos                  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_pickers_updated_at               BEFORE UPDATE ON public.pickers               FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_payment_methods_updated_at       BEFORE UPDATE ON public.payment_methods       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_route_definitions_updated_at     BEFORE UPDATE ON public.route_definitions     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_sub_admin_permissions_updated_at BEFORE UPDATE ON public.sub_admin_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STEP 6: ADMIN CREATION HELPER FUNCTION
-- Run this function anytime to create a Super Admin with ANY custom username & password:
-- Example: SELECT public.create_admin_user('my_custom_username', 'MySecurePassword123!', 'Admin Name');
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_admin_user(
  p_username TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT 'Super Admin'
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_email TEXT := LOWER(TRIM(p_username)) || '@mellod.internal';
BEGIN
  -- Insert into auth.users using pgcrypto for password hashing
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name),
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  );

  -- Insert into public.profiles
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    username,
    phone,
    generated_password
  ) VALUES (
    v_user_id,
    p_full_name,
    'admin',
    LOWER(TRIM(p_username)),
    NULL,
    p_password
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DONE. Next steps:
-- 1. Create "pickup-photos" Storage bucket (private) in dashboard
-- 2. Create your initial admin account by running:
--    SELECT public.create_admin_user('your_custom_username', 'your_custom_password', 'Admin Name');
-- ============================================================
