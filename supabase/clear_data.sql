-- ============================================================
-- MELLOD UCO COLLECTION APP — CLEAN SLATE DATABASE RESET
-- RUN THIS IN THE SUPABASE SQL EDITOR (DATABASE > SQL EDITOR)
-- ============================================================

-- 1. Truncate all custom tables in public schema (CASCADE handles foreign key dependencies)
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

-- 2. Delete all registered users from Supabase Auth
DELETE FROM auth.users;
