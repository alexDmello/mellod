-- ============================================================
-- MELLOD PWA — QR ORDERING UNIFIED MIGRATION SQL
-- Run this in the Supabase SQL Editor for project xfaepujwfnsowngdrwag
-- ============================================================

-- 1. Add QR Ordering feature control flags & configuration to public.fbos
ALTER TABLE public.fbos
  ADD COLUMN IF NOT EXISTS qr_enabled_by_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS qr_opted_in_by_fbo   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS slug                 VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS brand_color          VARCHAR(7) DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS logo_url             TEXT,
  ADD COLUMN IF NOT EXISTS operational_mode     VARCHAR(20) DEFAULT 'hybrid'
                          CHECK (operational_mode IN ('dine_in','counter_qsr','hybrid')),
  ADD COLUMN IF NOT EXISTS allow_pay_later        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS merchant_upi_id        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bank_account_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS gstin                  VARCHAR(15),
  ADD COLUMN IF NOT EXISTS max_order_amount_alert NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS token_signing_salt     TEXT,
  ADD COLUMN IF NOT EXISTS store_hours            JSONB,
  ADD COLUMN IF NOT EXISTS table_count            INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_mode            VARCHAR(20) DEFAULT 'direct_upi'
                          CHECK (payout_mode IN ('direct_upi','platform_gateway')),
  ADD COLUMN IF NOT EXISTS dpdp_consent           BOOLEAN DEFAULT FALSE;

-- 2. CREATE FBO TABLES (Table numbers & signed tokens)
CREATE TABLE IF NOT EXISTS public.fbo_tables (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id           UUID REFERENCES public.fbos(id) ON DELETE CASCADE NOT NULL,
    table_number     VARCHAR(20) NOT NULL,
    signed_token     TEXT UNIQUE NOT NULL,
    token_issued_at  TIMESTAMPTZ DEFAULT NOW(),
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fbo_id, table_number)
);

-- 3. TABLE SESSIONS (Tabs)
CREATE TABLE IF NOT EXISTS public.table_sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id     UUID REFERENCES public.fbos(id) ON DELETE CASCADE NOT NULL,
    table_id   UUID REFERENCES public.fbo_tables(id) ON DELETE SET NULL,
    status     VARCHAR(20) DEFAULT 'open'
               CHECK (status IN ('open','flagged','settled')),
    opened_at  TIMESTAMPTZ DEFAULT NOW(),
    closed_at  TIMESTAMPTZ
);

-- 4. CATEGORIES & MENU ITEMS
CREATE TABLE IF NOT EXISTS public.categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id     UUID REFERENCES public.fbos(id) ON DELETE CASCADE NOT NULL,
    name       VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active  BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.menu_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id       UUID REFERENCES public.fbos(id) ON DELETE CASCADE NOT NULL,
    category_id  UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    price        NUMERIC(10,2) NOT NULL,
    image_url    TEXT,
    is_veg       BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS & ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.orders (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id                UUID REFERENCES public.fbos(id) ON DELETE CASCADE NOT NULL,
    table_session_id      UUID REFERENCES public.table_sessions(id) ON DELETE SET NULL,
    order_type            VARCHAR(20) NOT NULL CHECK (order_type IN ('table','counter')),
    token_number          VARCHAR(20),
    client_reference_id   TEXT UNIQUE NOT NULL,
    status                VARCHAR(30) DEFAULT 'pending_payment'
                          CHECK (status IN ('pending_payment','received','preparing','ready','completed','cancelled')),
    payment_status        VARCHAR(20) DEFAULT 'unpaid'
                          CHECK (payment_status IN ('unpaid','paid','failed','refunded')),
    payment_method        VARCHAR(30)
                          CHECK (payment_method IN ('online_pg','direct_upi_manual','cash', NULL)),
    gateway_transaction_id TEXT UNIQUE,
    total_amount          NUMERIC(10,2) NOT NULL,
    notes                 TEXT,
    cancelled_reason      TEXT,
    cancelled_by          UUID REFERENCES auth.users(id),
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id             UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    menu_item_id         UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name            VARCHAR(255) NOT NULL,
    quantity             INT NOT NULL CHECK (quantity > 0),
    unit_price           NUMERIC(10,2) NOT NULL,
    customization_details JSONB
);

-- 6. ATOMIC DAILY COUNTERS (For race-safe walk-in counter tokens T-001)
CREATE TABLE IF NOT EXISTS public.daily_counters (
    fbo_id     UUID REFERENCES public.fbos(id) ON DELETE CASCADE NOT NULL,
    order_date DATE NOT NULL,
    count      INT NOT NULL DEFAULT 0,
    PRIMARY KEY (fbo_id, order_date)
);

CREATE OR REPLACE FUNCTION generate_daily_token(p_fbo_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO public.daily_counters (fbo_id, order_date, count)
    VALUES (p_fbo_id, CURRENT_DATE, 1)
    ON CONFLICT (fbo_id, order_date)
    DO UPDATE SET count = public.daily_counters.count + 1
    RETURNING count INTO v_count;

    RETURN 'T-' || LPAD(v_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. AUDIT LOG FOR QR OPERATIONS
CREATE TABLE IF NOT EXISTS public.audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id        UUID REFERENCES public.fbos(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES auth.users(id),
    action        VARCHAR(100) NOT NULL,
    target_table  VARCHAR(50),
    target_id     UUID,
    details       JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ENABLE RLS
ALTER TABLE public.fbo_tables     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log      ENABLE ROW LEVEL SECURITY;

-- 9. REALTIME PUBLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_sessions;
