-- SQL Migration Script for Custom Roles & Granular Staff Access Control

-- 1. Create custom_roles table for storing role templates and default permissions
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key       TEXT NOT NULL UNIQUE,
  role_name      TEXT NOT NULL,
  description    TEXT,
  default_routes TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated" ON public.custom_roles;
CREATE POLICY "Allow read for authenticated" ON public.custom_roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all for service_role" ON public.custom_roles;
CREATE POLICY "Allow all for service_role" ON public.custom_roles
  FOR ALL TO service_role USING (true);

-- Insert default role templates if not existing
INSERT INTO public.custom_roles (role_key, role_name, description, default_routes)
VALUES 
  ('sub_admin', 'Sub-Admin', 'Full operational management with customized section permissions', ARRAY['/admin', '/admin/onboarding', '/admin/routes', '/admin/pickers', '/admin/map']),
  ('manager', 'General Manager', 'Management oversight for routes, pickups, analytics, and financials', ARRAY['/admin', '/admin/analytics', '/admin/financials', '/admin/payments', '/admin/pickers', '/admin/routes', '/admin/map']),
  ('staff', 'Operations Staff', 'Day-to-day picker logs review, onboarding, and route dispatches', ARRAY['/admin', '/admin/pickers', '/admin/onboarding', '/admin/routes']),
  ('finance', 'Finance Manager', 'Financial ledger, P&L reports, and FBO payment disbursements', ARRAY['/admin', '/admin/financials', '/admin/payments', '/admin/analytics']),
  ('dispatcher', 'Route Dispatcher', 'Route scheduling, map tracking, and picker dispatches', ARRAY['/admin', '/admin/routes', '/admin/map', '/admin/pickers'])
ON CONFLICT (role_key) DO UPDATE 
SET default_routes = EXCLUDED.default_routes, description = EXCLUDED.description;
