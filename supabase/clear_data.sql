-- ============================================================
-- MELLOD UCO COLLECTION APP — CLEAN SLATE DATABASE RESET
-- RUN THIS IN THE SUPABASE SQL EDITOR (DATABASE > SQL EDITOR)
-- ============================================================

-- 1. Truncate all custom tables in public schema
-- (RESTART IDENTITY CASCADE handles primary key counters & foreign key order automatically)
TRUNCATE TABLE 
  public.fbo_payments,
  public.pickups,
  public.financial_transactions,
  public.payment_methods,
  public.route_stops,
  public.route_definitions,
  public.routes,
  public.fbos,
  public.pickers,
  public.daily_prices,
  public.custom_roles,
  public.profiles
  RESTART IDENTITY CASCADE;

-- 2. Re-seed default custom roles required for admin panel access control
INSERT INTO public.custom_roles (role_key, role_name, description, default_routes)
VALUES 
  ('sub_admin', 'Sub-Admin', 'Full operational management with customized section permissions', ARRAY['/admin', '/admin/onboarding', '/admin/routes', '/admin/pickers', '/admin/map']),
  ('manager', 'General Manager', 'Management oversight for routes, pickups, analytics, and financials', ARRAY['/admin', '/admin/analytics', '/admin/financials', '/admin/payments', '/admin/pickers', '/admin/routes', '/admin/map']),
  ('staff', 'Operations Staff', 'Day-to-day picker logs review, onboarding, and route dispatches', ARRAY['/admin', '/admin/pickers', '/admin/onboarding', '/admin/routes']),
  ('finance', 'Finance Manager', 'Financial ledger, P&L reports, and FBO payment disbursements', ARRAY['/admin', '/admin/financials', '/admin/payments', '/admin/analytics']),
  ('dispatcher', 'Route Dispatcher', 'Route scheduling, map tracking, and picker dispatches', ARRAY['/admin', '/admin/routes', '/admin/map', '/admin/pickers'])
ON CONFLICT (role_key) DO UPDATE 
SET default_routes = EXCLUDED.default_routes, description = EXCLUDED.description;

-- 3. Delete all registered accounts from Supabase Auth
-- (This removes all login credentials and Auth users so you can re-register everything fresh)
DELETE FROM auth.users;
