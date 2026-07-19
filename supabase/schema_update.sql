-- ============================================================
-- MELLOD UCO COLLECTION APP — SCHEMA UPDATE
-- RUN THIS IN THE SUPABASE SQL EDITOR (DATABASE > SQL EDITOR)
-- ============================================================

-- 1. Create Route Definitions (Templates)
CREATE TABLE IF NOT EXISTS public.route_definitions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL UNIQUE,
  default_picker_id  UUID REFERENCES public.pickers(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create Route Stops (FBOs in a Route template)
CREATE TABLE IF NOT EXISTS public.route_stops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_definition_id UUID REFERENCES public.route_definitions(id) ON DELETE CASCADE NOT NULL,
  fbo_id              UUID REFERENCES public.fbos(id) ON DELETE CASCADE NOT NULL,
  sort_order          INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (route_definition_id, fbo_id)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.route_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

-- 4. Admins manage route definitions
DROP POLICY IF EXISTS "Admins manage route definitions" ON public.route_definitions;
CREATE POLICY "Admins manage route definitions" ON public.route_definitions
  FOR ALL USING (public.is_admin());

-- 5. Admins manage route stops
DROP POLICY IF EXISTS "Admins manage route stops" ON public.route_stops;
CREATE POLICY "Admins manage route stops" ON public.route_stops
  FOR ALL USING (public.is_admin());

-- 6. Authenticated select permissions
DROP POLICY IF EXISTS "Authenticated users read route definitions" ON public.route_definitions;
CREATE POLICY "Authenticated users read route definitions" ON public.route_definitions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users read route stops" ON public.route_stops;
CREATE POLICY "Authenticated users read route stops" ON public.route_stops
  FOR SELECT TO authenticated USING (true);
