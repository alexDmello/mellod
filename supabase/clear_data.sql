-- ============================================================
-- MELLOD UCO COLLECTION APP — CLEAN SLATE DATABASE RESET
-- RUN THIS IN THE SUPABASE SQL EDITOR (DATABASE > SQL EDITOR)
-- ============================================================

-- 1. Truncate all custom tables in public schema (CASCADE will handle dependencies)
TRUNCATE TABLE 
  public.pickups,
  public.payment_methods,
  public.route_stops,
  public.route_definitions,
  public.routes,
  public.fbos,
  public.pickers,
  public.daily_prices,
  public.sub_admin_permissions,
  public.profiles
  RESTART IDENTITY CASCADE;

-- 2. Delete all registered accounts from Supabase Auth
-- (This removes all login credentials and Auth users so you can re-register everything fresh)
DELETE FROM auth.users;
