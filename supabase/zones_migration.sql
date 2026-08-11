-- ============================================================
-- MELLOD — ZONES MIGRATION
-- Bangalore 5 Municipal Corporation Restructure (GBA 2025)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. ZONES TABLE (fixed: North, South, East, West, Central)
CREATE TABLE IF NOT EXISTS public.zones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  color      TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. ADD ZONE COLUMN TO FBOS
ALTER TABLE public.fbos
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;

-- 3. ADD ZONE + DESCRIPTION TO ROUTE_DEFINITIONS
ALTER TABLE public.route_definitions
  ADD COLUMN IF NOT EXISTS zone_id     UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================
-- SEED ZONES (Bangalore 5 Municipal Corporations)
-- ============================================================

INSERT INTO public.zones (name, color) VALUES
  ('North',   '#ef4444'),   -- Red   (Corp 1)
  ('Central', '#f97316'),   -- Orange (Corp 2)
  ('West',    '#3b82f6'),   -- Blue   (Corp 3)
  ('South',   '#eab308'),   -- Yellow (Corp 4)
  ('East',    '#22c55e')    -- Green  (Corp 5)
ON CONFLICT (name) DO NOTHING;
