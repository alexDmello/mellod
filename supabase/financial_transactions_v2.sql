-- ============================================================
-- MELLOD — FINANCIAL TRANSACTIONS v2 MIGRATION
-- Phase 2: Liability type, COGS/OPEX, Opening Balance,
--          GST, Payment Mode, Soft-Delete, Updated_at
-- Run this in the Supabase SQL Editor (Database > SQL Editor)
-- ============================================================

-- 1. Expand type CHECK constraint to include 'Liability'
ALTER TABLE public.financial_transactions
  DROP CONSTRAINT IF EXISTS financial_transactions_type_check;

ALTER TABLE public.financial_transactions
  ADD CONSTRAINT financial_transactions_type_check
    CHECK (type IN ('Income', 'Expense', 'Asset', 'Transfer', 'Liability'));

-- 2. Cost classification for expenses (COGS vs OPEX)
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS cost_type VARCHAR(10)
    CHECK (cost_type IN ('COGS', 'OPEX') OR cost_type IS NULL);

-- 3. Opening balance flag with uniqueness constraint
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS is_opening_balance BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure at most one opening balance row exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_opening_balance
  ON public.financial_transactions (is_opening_balance)
  WHERE is_opening_balance = TRUE;

-- 4. GST fields
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS cgst NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS sgst NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS igst NUMERIC(12,2);

-- 5. Payment mode
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20)
    CHECK (payment_mode IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque') OR payment_mode IS NULL);

-- 6. Soft-delete / void fields (wired in Phase 3, columns added now)
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS is_voided BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS voided_reason TEXT,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

-- 7. Updated_at tracking (matches existing pattern for other tables)
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Reuse the existing update_updated_at_column() trigger function
CREATE TRIGGER set_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Tighten RLS: restrict financial_transactions to admins only
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.financial_transactions;
DROP POLICY IF EXISTS "Allow insert access for authenticated users" ON public.financial_transactions;
DROP POLICY IF EXISTS "Allow update/delete for authenticated users" ON public.financial_transactions;

-- Replace with admin-only policies
CREATE POLICY "Admins manage financial_transactions"
  ON public.financial_transactions
  FOR ALL TO authenticated
  USING (public.is_admin());

-- ============================================================
-- BACKFILL: Set cost_type on existing expense rows
-- ============================================================
UPDATE public.financial_transactions
  SET cost_type = 'COGS'
  WHERE type = 'Expense'
    AND category IN ('FBO Restaurant Payout', 'Logistics & Fleet', 'Procurement')
    AND cost_type IS NULL;

UPDATE public.financial_transactions
  SET cost_type = 'OPEX'
  WHERE type = 'Expense'
    AND category IN ('Payroll', 'Infrastructure', 'Marketing', 'Utilities')
    AND cost_type IS NULL;
