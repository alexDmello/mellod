-- ============================================================
-- Supabase Setup for Financial Transactions Ledger Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('Income', 'Expense', 'Asset', 'Transfer')),
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_id VARCHAR(100) NOT NULL,
  notes TEXT,
  proof_url TEXT,
  proof_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and insert transactions
CREATE POLICY "Allow read access for authenticated users"
ON public.financial_transactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert access for authenticated users"
ON public.financial_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update/delete for authenticated users"
ON public.financial_transactions FOR ALL
TO authenticated
USING (true);
