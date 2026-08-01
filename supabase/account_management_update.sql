-- ============================================================
-- MELLOD — ACCOUNT MANAGEMENT & CREDENTIALS UPDATE SCRIPT
-- Run this in Supabase SQL Editor if 'generated_password' column
-- is not yet added to your 'profiles' table.
-- ============================================================

-- Ensure profiles table has generated_password column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS generated_password TEXT;
