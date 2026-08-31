-- Migration: 05_pickup_requests.sql
-- Description: Create pickup_requests table for FBO pickup requests and Admin scheduling

CREATE TABLE IF NOT EXISTS public.pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fbo_id UUID NOT NULL REFERENCES public.fbos(id) ON DELETE CASCADE,
  estimated_liters NUMERIC(10, 2) NOT NULL CHECK (estimated_liters > 0),
  preferred_date DATE NOT NULL,
  preferred_time_slot TEXT DEFAULT 'Anytime',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'assigned', 'completed', 'cancelled')),
  assigned_picker_id UUID REFERENCES public.pickers(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pickup_requests_fbo_id ON public.pickup_requests(fbo_id);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_status ON public.pickup_requests(status);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_preferred_date ON public.pickup_requests(preferred_date);

-- Enable RLS
ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow authenticated users access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pickup_requests' AND policyname = 'Allow public select access to pickup_requests'
  ) THEN
    CREATE POLICY "Allow public select access to pickup_requests" ON public.pickup_requests FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pickup_requests' AND policyname = 'Allow public insert access to pickup_requests'
  ) THEN
    CREATE POLICY "Allow public insert access to pickup_requests" ON public.pickup_requests FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pickup_requests' AND policyname = 'Allow public update access to pickup_requests'
  ) THEN
    CREATE POLICY "Allow public update access to pickup_requests" ON public.pickup_requests FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pickup_requests' AND policyname = 'Allow public delete access to pickup_requests'
  ) THEN
    CREATE POLICY "Allow public delete access to pickup_requests" ON public.pickup_requests FOR DELETE USING (true);
  END IF;
END $$;
