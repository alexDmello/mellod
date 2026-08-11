-- ============================================================
-- MELLOD — ROUTE SCHEDULES MIGRATION
-- Pre-scheduled automatic dispatches for future dates
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.route_schedules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_definition_id  UUID REFERENCES public.route_definitions(id) ON DELETE CASCADE NOT NULL,
  scheduled_date       DATE NOT NULL,
  picker_id            UUID REFERENCES public.pickers(id) ON DELETE SET NULL,
  fbo_ids              UUID[] NOT NULL DEFAULT '{}',   -- ordered list of FBO ids to dispatch
  is_executed          BOOLEAN NOT NULL DEFAULT FALSE,
  executed_at          TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (route_definition_id, scheduled_date)         -- one schedule per route per day
);

-- Index for fast date-based lookups
CREATE INDEX IF NOT EXISTS idx_route_schedules_date ON public.route_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_route_schedules_executed ON public.route_schedules(is_executed, scheduled_date);

-- RLS
ALTER TABLE public.route_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read route_schedules"
  ON public.route_schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage route_schedules"
  ON public.route_schedules FOR ALL USING (public.is_admin());
