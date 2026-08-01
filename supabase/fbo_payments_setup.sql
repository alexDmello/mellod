-- SQL migration script to set up fbo_payments table & payment_status column in Supabase

-- 1. Ensure payment_status column exists on pickups table
ALTER TABLE public.pickups 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' NOT NULL;

-- 2. Create fbo_payments table for disbursement receipts
CREATE TABLE IF NOT EXISTS public.fbo_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fbo_id           UUID REFERENCES public.fbos(id) ON DELETE CASCADE NOT NULL,
  receipt_number   TEXT NOT NULL UNIQUE,
  amount           NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  total_liters     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('bank', 'upi', 'cash')),
  reference_number TEXT,
  notes            TEXT,
  period_label     TEXT,
  pickup_ids       UUID[] DEFAULT '{}',
  paid_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.fbo_payments ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users (FBOs can read their payments, Admins can read all)
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.fbo_payments;
CREATE POLICY "Allow read access to authenticated users" ON public.fbo_payments
  FOR SELECT TO authenticated USING (true);

-- Allow all operations for service_role / admin client
DROP POLICY IF EXISTS "Allow full access for service_role" ON public.fbo_payments;
CREATE POLICY "Allow full access for service_role" ON public.fbo_payments
  FOR ALL TO service_role USING (true);
