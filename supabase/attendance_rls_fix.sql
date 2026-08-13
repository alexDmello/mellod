-- ============================================================
-- MELLOD — ATTENDANCE RLS FIX & DEBUG
-- Run this in Supabase SQL Editor if check-in still shows "Not Marked"
-- ============================================================

-- Step 1: Drop ALL existing attendance_records policies (prevent duplicates/conflicts)
DROP POLICY IF EXISTS "Users view own attendance"    ON public.attendance_records;
DROP POLICY IF EXISTS "Users insert own attendance"  ON public.attendance_records;
DROP POLICY IF EXISTS "Users update own attendance"  ON public.attendance_records;
DROP POLICY IF EXISTS "Admins manage attendance"     ON public.attendance_records;

-- Step 2: Re-create clean, non-conflicting policies

-- SELECT: users can see their own records; internal staff/admins see all non-FBO records
CREATE POLICY "attendance_select"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()        -- own record (pickers & staff)
    OR public.is_admin()           -- staff/sub_admin/admin see all
  );

-- INSERT: users can only insert their own records
CREATE POLICY "attendance_insert"
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- UPDATE: users can update their own records; admins can update all
CREATE POLICY "attendance_update"
  ON public.attendance_records FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- DELETE: admins only
CREATE POLICY "attendance_delete"
  ON public.attendance_records FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- VERIFICATION QUERIES (run these to check if data exists)
-- ============================================================

-- Check if today's records exist (replace 'YYYY-MM-DD' with today's date)
-- SELECT * FROM public.attendance_records WHERE attendance_date = CURRENT_DATE;

-- Check if any records exist at all
-- SELECT COUNT(*), MAX(attendance_date) FROM public.attendance_records;

-- Check what today's date is on the server (timezone-aware)
-- SELECT CURRENT_DATE, NOW() AT TIME ZONE 'Asia/Kolkata';
