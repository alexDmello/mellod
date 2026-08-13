-- ============================================================
-- INDIA DPDP ACT 2023 COMPLIANCE MIGRATION & RLS POLICIES
-- ============================================================

-- 1. USER CONSENTS TABLE (DPDP Act Section 6 - Explicit & Itemized Consent)
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  essential_consent BOOLEAN NOT NULL DEFAULT TRUE, -- Essential app operation
  telemetry_consent BOOLEAN NOT NULL DEFAULT FALSE, -- Analytics & telemetry (Default: Un-ticked)
  pwa_storage_consent BOOLEAN NOT NULL DEFAULT FALSE, -- Offline PWA caching (Default: Un-ticked)
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE, -- Marketing/Updates (Default: Un-ticked)
  consented_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  withdrawn_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id)
);

-- Enable RLS on user_consents
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_consents (Strict Data Principal Isolation)
CREATE POLICY "Users read own consents" ON public.user_consents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own consents" ON public.user_consents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own consents" ON public.user_consents
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. DPO / GRIEVANCE TICKETS TABLE (DPDP Act Section 13 - Grievance Redressal Mechanism)
CREATE TABLE IF NOT EXISTS public.dpdp_grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  category TEXT NOT NULL CHECK (category IN ('consent_withdrawal', 'data_correction', 'data_export', 'unauthorized_processing', 'other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.dpdp_grievances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own grievances" ON public.dpdp_grievances
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users create grievances" ON public.dpdp_grievances
  FOR INSERT WITH CHECK (auth.uid() IS NULL OR user_id = auth.uid());

-- 3. FIX OVERLY PERMISSIVE RLS ON FINANCIAL TRANSACTIONS
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.financial_transactions;
DROP POLICY IF EXISTS "Allow insert access for authenticated users" ON public.financial_transactions;
DROP POLICY IF EXISTS "Allow update/delete for authenticated users" ON public.financial_transactions;

-- Strict access: Only admins can view and manage financial transactions
CREATE POLICY "Admins manage financial transactions" ON public.financial_transactions
  FOR ALL USING (public.is_admin());

-- 4. PL/PGSQL FUNCTION FOR COMPLETE DATA ERASURE (DPDP Act Section 12 - Right to Erasure / Erasure Trigger)
CREATE OR REPLACE FUNCTION public.erase_user_data(target_user_id UUID)
RETURNS VOID SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- DPDP Section 12: Erase personal identifiers while retaining anonymized legal/financial transaction history
  
  -- Step A: Clear Sensitive Payment Methods
  DELETE FROM public.payment_methods
  WHERE fbo_id IN (SELECT id FROM public.fbos WHERE profile_id = target_user_id);

  -- Step B: Anonymize FBO profile records
  UPDATE public.fbos
  SET business_name = 'Anonymized FBO Business',
      address = 'Redacted under DPDP Act',
      contact_person = 'Redacted',
      phone = NULL,
      fssai_license = NULL,
      latitude = NULL,
      longitude = NULL,
      is_active = FALSE
  WHERE profile_id = target_user_id;

  -- Step C: Anonymize Picker profile records
  UPDATE public.pickers
  SET vehicle_info = 'Redacted',
      is_active = FALSE
  WHERE profile_id = target_user_id;

  -- Step D: Delete user consent records
  DELETE FROM public.user_consents
  WHERE user_id = target_user_id;

  -- Step E: Anonymize main Profile entry
  UPDATE public.profiles
  SET full_name = 'Deleted User',
      phone = NULL,
      username = 'deleted_' || target_user_id::text
  WHERE id = target_user_id;

  -- Step F: Delete Auth User (Supabase Auth Cascade)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;
