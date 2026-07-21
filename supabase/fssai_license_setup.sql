-- ============================================================
-- Supabase Setup for FSSAI License Column & RLS Policies
-- Execute this in the Supabase SQL Editor (Database > SQL Editor)
-- ============================================================

-- 1. Add fssai_license column to fbos table if not exists
ALTER TABLE public.fbos 
ADD COLUMN IF NOT EXISTS fssai_license VARCHAR(100);

-- 2. Allow FBO users to update their own fbos record
DROP POLICY IF EXISTS "FBOs update own record" ON public.fbos;

CREATE POLICY "FBOs update own record" ON public.fbos
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
