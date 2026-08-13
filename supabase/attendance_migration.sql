-- ============================================================
-- MELLOD — ATTENDANCE & LEAVE MANAGEMENT MIGRATION
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 0. ADD IS_ATTENDANCE_ENABLED TO PROFILES TABLE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_attendance_enabled BOOLEAN DEFAULT TRUE NOT NULL;

-- 1. OFFICE LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.office_locations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  latitude              DOUBLE PRECISION NOT NULL,
  longitude             DOUBLE PRECISION NOT NULL,
  allowed_radius_meters INT NOT NULL DEFAULT 100,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed default office location (Bangalore HQ)
INSERT INTO public.office_locations (name, latitude, longitude, allowed_radius_meters, is_active)
VALUES ('Bangalore HQ', 12.9716, 77.5946, 100, true)
ON CONFLICT DO NOTHING;


-- 2. LEAVE QUOTAS TABLE
CREATE TABLE IF NOT EXISTS public.leave_quotas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role         TEXT NOT NULL, -- 'staff' | 'picker'
  category     TEXT NOT NULL, -- 'CL' | 'SL' | 'EL' | 'PUBLIC'
  annual_quota NUMERIC NOT NULL DEFAULT 12,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (role, category)
);

-- Seed default annual quotas
INSERT INTO public.leave_quotas (role, category, annual_quota) VALUES
  ('staff', 'CL', 12),
  ('staff', 'SL', 12),
  ('staff', 'EL', 15),
  ('staff', 'PUBLIC', 12),
  ('picker', 'CL', 12),
  ('picker', 'SL', 12),
  ('picker', 'EL', 15),
  ('picker', 'PUBLIC', 12)
ON CONFLICT (role, category) DO NOTHING;


-- 3. STAFF WEEKLY SCHEDULE TABLE
CREATE TABLE IF NOT EXISTS public.staff_schedules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  monday_mode    TEXT NOT NULL DEFAULT 'wfo',
  tuesday_mode   TEXT NOT NULL DEFAULT 'wfo',
  wednesday_mode TEXT NOT NULL DEFAULT 'wfh',
  thursday_mode  TEXT NOT NULL DEFAULT 'wfo',
  friday_mode    TEXT NOT NULL DEFAULT 'wfh',
  saturday_mode  TEXT NOT NULL DEFAULT 'wfo',
  sunday_mode    TEXT NOT NULL DEFAULT 'wfh',
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


-- 4. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  attendance_date    DATE NOT NULL,
  work_mode          TEXT NOT NULL, -- 'wfo', 'wfh', 'holiday', 'leave', 'absent'
  check_in_at        TIMESTAMPTZ,
  check_out_at       TIMESTAMPTZ,
  check_in_lat       DOUBLE PRECISION,
  check_in_lng       DOUBLE PRECISION,
  check_out_lat      DOUBLE PRECISION,
  check_out_lng      DOUBLE PRECISION,
  office_location_id UUID REFERENCES public.office_locations(id) ON DELETE SET NULL,
  distance_meters    DOUBLE PRECISION,
  is_flagged         BOOLEAN DEFAULT FALSE NOT NULL,
  flagged_reason     TEXT,
  approval_status    TEXT DEFAULT 'approved' NOT NULL, -- 'approved', 'pending', 'rejected'
  reviewed_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (profile_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_profile ON public.attendance_records(profile_id, attendance_date);


-- 5. LEAVE / HOLIDAY REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  request_type     TEXT NOT NULL, -- 'pre_approved', 'emergency'
  leave_category   TEXT NOT NULL, -- 'CL', 'SL', 'EL', 'PUBLIC'
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  days_count       NUMERIC DEFAULT 1 NOT NULL,
  reason           TEXT,
  status           TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
  reviewed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);


-- 6. WORK MODE SWITCH REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.work_mode_switch_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  switch_date    DATE NOT NULL,
  requested_mode TEXT NOT NULL, -- 'wfo', 'wfh'
  reason         TEXT,
  status         TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
  reviewed_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.office_locations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_quotas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_mode_switch_requests ENABLE ROW LEVEL SECURITY;

-- Office Locations: Everyone authenticated can read, admins can manage
CREATE POLICY "Authenticated read office_locations"
  ON public.office_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage office_locations"
  ON public.office_locations FOR ALL USING (public.is_admin());

-- Leave Quotas: Everyone authenticated can read, admins can manage
CREATE POLICY "Authenticated read leave_quotas"
  ON public.leave_quotas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage leave_quotas"
  ON public.leave_quotas FOR ALL USING (public.is_admin());

-- Staff Schedules: Users read own or admins manage all
CREATE POLICY "Users read own schedule"
  ON public.staff_schedules FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins manage staff_schedules"
  ON public.staff_schedules FOR ALL USING (public.is_admin());

-- Attendance Records: Users read/insert own, admins manage all
CREATE POLICY "Users view own attendance"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users insert own attendance"
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users update own attendance"
  ON public.attendance_records FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins manage attendance"
  ON public.attendance_records FOR ALL USING (public.is_admin());

-- Leave Requests: Users manage own, admins manage all
CREATE POLICY "Users view own leave_requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users insert own leave_requests"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Admins manage leave_requests"
  ON public.leave_requests FOR ALL USING (public.is_admin());

-- Work Mode Switch Requests: Users manage own, admins manage all
CREATE POLICY "Users view own switch_requests"
  ON public.work_mode_switch_requests FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users insert own switch_requests"
  ON public.work_mode_switch_requests FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Admins manage switch_requests"
  ON public.work_mode_switch_requests FOR ALL USING (public.is_admin());
