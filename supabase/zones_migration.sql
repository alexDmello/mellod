-- ============================================================
-- MELLOD — ZONES & SUB-ZONES MIGRATION
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

-- 2. SUB-ZONES TABLE (Municipal Corporations)
CREATE TABLE IF NOT EXISTS public.sub_zones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id    UUID REFERENCES public.zones(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  areas      TEXT,       -- comma-separated key areas for display
  boundary   JSONB,      -- [{lat, lng}] polygon array for point-in-polygon
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. ADD ZONE/SUB-ZONE COLUMNS TO FBOS
ALTER TABLE public.fbos
  ADD COLUMN IF NOT EXISTS zone_id     UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sub_zone_id UUID REFERENCES public.sub_zones(id) ON DELETE SET NULL;

-- 4. ADD ZONE/SUB-ZONE + DESCRIPTION TO ROUTE_DEFINITIONS
ALTER TABLE public.route_definitions
  ADD COLUMN IF NOT EXISTS zone_id     UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sub_zone_id UUID REFERENCES public.sub_zones(id) ON DELETE SET NULL,
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

-- ============================================================
-- SEED SUB-ZONES
-- Boundaries are approximate polygons [lat, lng] for
-- client-side point-in-polygon detection
-- ============================================================

-- Corp 1 — North
INSERT INTO public.sub_zones (zone_id, name, slug, areas, boundary)
SELECT
  z.id,
  'Bengaluru North City Corporation',
  'bncc',
  'Bytarayanpura, RR Nagar, Dasarahalli, Yeshwantapura, Yelahanka',
  '[
    {"lat": 13.00, "lng": 77.48},
    {"lat": 13.05, "lng": 77.46},
    {"lat": 13.17, "lng": 77.50},
    {"lat": 13.17, "lng": 77.68},
    {"lat": 13.05, "lng": 77.68},
    {"lat": 13.00, "lng": 77.63},
    {"lat": 12.98, "lng": 77.60},
    {"lat": 12.97, "lng": 77.56}
  ]'::jsonb
FROM public.zones z WHERE z.name = 'North'
ON CONFLICT (slug) DO NOTHING;

-- Corp 2 — Central
INSERT INTO public.sub_zones (zone_id, name, slug, areas, boundary)
SELECT
  z.id,
  'Bengaluru Central City Corporation',
  'bccc',
  'Shivaji Nagar, Gandhi Nagar, Hebbal, Malleshwaram, Rajaji Nagar, Mahalakshmi Layout',
  '[
    {"lat": 12.97, "lng": 77.56},
    {"lat": 12.98, "lng": 77.60},
    {"lat": 13.00, "lng": 77.63},
    {"lat": 12.97, "lng": 77.65},
    {"lat": 12.95, "lng": 77.62},
    {"lat": 12.94, "lng": 77.58},
    {"lat": 12.95, "lng": 77.54}
  ]'::jsonb
FROM public.zones z WHERE z.name = 'Central'
ON CONFLICT (slug) DO NOTHING;

-- Corp 3 — West
INSERT INTO public.sub_zones (zone_id, name, slug, areas, boundary)
SELECT
  z.id,
  'Bengaluru West City Corporation',
  'bwcc',
  'Vijayanagar, Chamrajpet, Chickpet, Basavanagudi, Govindaraja Nagar, Padmanaba Nagar',
  '[
    {"lat": 12.97, "lng": 77.56},
    {"lat": 12.95, "lng": 77.54},
    {"lat": 12.94, "lng": 77.52},
    {"lat": 12.90, "lng": 77.52},
    {"lat": 12.87, "lng": 77.50},
    {"lat": 12.87, "lng": 77.47},
    {"lat": 13.00, "lng": 77.47},
    {"lat": 13.00, "lng": 77.48}
  ]'::jsonb
FROM public.zones z WHERE z.name = 'West'
ON CONFLICT (slug) DO NOTHING;

-- Corp 4 — South
INSERT INTO public.sub_zones (zone_id, name, slug, areas, boundary)
SELECT
  z.id,
  'Bengaluru South City Corporation',
  'bscc',
  'Jayanagar, JP Nagar, Bommanahalli, Bangalore South, Shanthi Nagar, Chickpet',
  '[
    {"lat": 12.94, "lng": 77.58},
    {"lat": 12.95, "lng": 77.62},
    {"lat": 12.97, "lng": 77.65},
    {"lat": 12.93, "lng": 77.70},
    {"lat": 12.88, "lng": 77.70},
    {"lat": 12.83, "lng": 77.62},
    {"lat": 12.84, "lng": 77.55},
    {"lat": 12.87, "lng": 77.50},
    {"lat": 12.90, "lng": 77.52},
    {"lat": 12.94, "lng": 77.52}
  ]'::jsonb
FROM public.zones z WHERE z.name = 'South'
ON CONFLICT (slug) DO NOTHING;

-- Corp 5 — East
INSERT INTO public.sub_zones (zone_id, name, slug, areas, boundary)
SELECT
  z.id,
  'Bengaluru East City Corporation',
  'becc',
  'Shivaji Nagar, CV Raman Nagar, Sarvagna Nagar, KR Puram, Mahadevpura, Whitefield',
  '[
    {"lat": 13.00, "lng": 77.63},
    {"lat": 13.05, "lng": 77.68},
    {"lat": 13.07, "lng": 77.82},
    {"lat": 12.98, "lng": 77.82},
    {"lat": 12.88, "lng": 77.75},
    {"lat": 12.88, "lng": 77.70},
    {"lat": 12.93, "lng": 77.70},
    {"lat": 12.97, "lng": 77.65},
    {"lat": 13.00, "lng": 77.63}
  ]'::jsonb
FROM public.zones z WHERE z.name = 'East'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================

ALTER TABLE public.zones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_zones ENABLE ROW LEVEL SECURITY;

-- Zones
CREATE POLICY "Authenticated read zones"
  ON public.zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage zones"
  ON public.zones FOR ALL USING (public.is_admin());

-- Sub Zones
CREATE POLICY "Authenticated read sub_zones"
  ON public.sub_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage sub_zones"
  ON public.sub_zones FOR ALL USING (public.is_admin());
