-- ============================================================
-- MELLOD — MAIN DB CLEANUP
-- Run this in your MAIN Supabase project SQL Editor.
-- This removes all QR/menu/ordering tables that will now
-- live in the dedicated Menu DB project.
-- Auth, profiles, fbos, pickers, routes, pickups STAY here.
-- ============================================================

-- ── Step 1: Remove realtime publication entries ──────────────
-- ALTER PUBLICATION does not support IF EXISTS, so we check pg_publication_tables first.
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY['order_items','orders','menu_items','table_sessions'];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- ── Step 2: Drop QR/Menu tables (in dependency order) ───────
DROP TABLE IF EXISTS public.audit_log       CASCADE;
DROP TABLE IF EXISTS public.daily_counters  CASCADE;
DROP TABLE IF EXISTS public.order_items     CASCADE;
DROP TABLE IF EXISTS public.orders          CASCADE;
DROP TABLE IF EXISTS public.menu_items      CASCADE;
DROP TABLE IF EXISTS public.categories      CASCADE;
DROP TABLE IF EXISTS public.table_sessions  CASCADE;
DROP TABLE IF EXISTS public.fbo_tables      CASCADE;

-- ── Step 3: Drop the old function (was in main DB) ──────────
DROP FUNCTION IF EXISTS generate_daily_token(UUID);

-- ── Step 4: Remove QR-related columns from fbos ─────────────
-- These are now stored per-fbo in the menu DB tenants snapshot,
-- but we KEEP slug, brand_color, logo_url, operational_mode,
-- allow_pay_later, merchant_upi_id, qr_enabled_by_admin,
-- qr_opted_in_by_fbo, token_signing_salt in fbos for the
-- admin control panel and public menu resolution.
-- 
-- Only remove columns that are purely menu-DB concerns:
ALTER TABLE public.fbos DROP COLUMN IF EXISTS bank_account_encrypted;
ALTER TABLE public.fbos DROP COLUMN IF EXISTS gstin;
ALTER TABLE public.fbos DROP COLUMN IF EXISTS max_order_amount_alert;
ALTER TABLE public.fbos DROP COLUMN IF EXISTS store_hours;
ALTER TABLE public.fbos DROP COLUMN IF EXISTS table_count;
ALTER TABLE public.fbos DROP COLUMN IF EXISTS payout_mode;
ALTER TABLE public.fbos DROP COLUMN IF EXISTS dpdp_consent;

-- ── DONE ─────────────────────────────────────────────────────
-- Your main DB is now clean.
-- Run 02_menu_db_schema.sql in the NEW menu project next.
