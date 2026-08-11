-- ============================================================
-- MELLOD — REMOVE SUB-ZONES MIGRATION
-- Run this in the Supabase SQL Editor to remove sub-zones
-- while leaving main Zones intact.
-- ============================================================

-- 1. Drop sub_zone_id column from fbos table
ALTER TABLE public.fbos
  DROP COLUMN IF EXISTS sub_zone_id;

-- 2. Drop sub_zone_id column from route_definitions table
ALTER TABLE public.route_definitions
  DROP COLUMN IF EXISTS sub_zone_id;

-- 3. Drop sub_zones table (CASCADE removes any dependent foreign key constraints)
DROP TABLE IF EXISTS public.sub_zones CASCADE;
