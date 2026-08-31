-- ============================================================
-- MELLOD — MENU DATABASE SCHEMA
-- Run this in your NEW (dedicated) Supabase project.
-- This project holds: categories, menu_items, orders,
-- order_items, fbo_tables, table_sessions, daily_counters,
-- audit_log, and the menu-images storage bucket.
--
-- Auth lives in the MAIN DB.  This DB uses service-role calls
-- from Next.js API routes — NO auth.users references here.
-- Row-level security is enforced via fbo_id matching on
-- service-role requests (your API routes own the trust layer).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ──────────────────────────────────────────────────────────────
-- 1. TABLE LAYOUT (fbo_tables + sessions)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fbo_tables (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id           UUID NOT NULL,                    -- refs main DB fbos.id
    table_number     VARCHAR(20) NOT NULL,
    signed_token     TEXT UNIQUE NOT NULL,
    token_issued_at  TIMESTAMPTZ DEFAULT NOW(),
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fbo_id, table_number)
);

CREATE TABLE IF NOT EXISTS table_sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id     UUID NOT NULL,
    table_id   UUID REFERENCES fbo_tables(id) ON DELETE SET NULL,
    status     VARCHAR(20) DEFAULT 'open'
               CHECK (status IN ('open','flagged','settled')),
    opened_at  TIMESTAMPTZ DEFAULT NOW(),
    closed_at  TIMESTAMPTZ
);

-- ──────────────────────────────────────────────────────────────
-- 2. CATEGORIES & MENU ITEMS (with image support)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id     UUID NOT NULL,
    name       VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active  BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id       UUID NOT NULL,
    category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    -- image_url stores the PUBLIC URL from menu-images storage bucket
    image_url    TEXT,
    -- image_path stores the storage object path for deletion purposes
    image_path   TEXT,
    is_veg       BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    sort_order   INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 3. ORDERS & ORDER ITEMS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id                 UUID NOT NULL,
    table_session_id       UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
    order_type             VARCHAR(20) NOT NULL
                           CHECK (order_type IN ('table','counter')),
    token_number           VARCHAR(20),
    client_reference_id    TEXT UNIQUE NOT NULL,   -- idempotency key
    status                 VARCHAR(30) DEFAULT 'pending_payment'
                           CHECK (status IN (
                             'pending_payment','received','preparing',
                             'ready','completed','cancelled'
                           )),
    payment_status         VARCHAR(20) DEFAULT 'unpaid'
                           CHECK (payment_status IN ('unpaid','paid','failed','refunded')),
    payment_method         VARCHAR(30)
                           CHECK (payment_method IN ('online_pg','direct_upi_manual','cash', NULL)),
    gateway_transaction_id TEXT UNIQUE,
    total_amount           NUMERIC(10,2) NOT NULL,
    notes                  TEXT,
    cancelled_reason       TEXT,
    -- cancelled_by is a user UUID from the main DB — stored as plain UUID (no FK)
    cancelled_by           UUID,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id              UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    menu_item_id          UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name             VARCHAR(255) NOT NULL,    -- snapshot at order time
    item_image_url        TEXT,                     -- snapshot so history is stable
    quantity              INT NOT NULL CHECK (quantity > 0),
    unit_price            NUMERIC(10,2) NOT NULL,   -- snapshot, server-side
    customization_details JSONB
);

-- ──────────────────────────────────────────────────────────────
-- 4. ATOMIC DAILY COUNTERS (race-safe token generation)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_counters (
    fbo_id     UUID NOT NULL,
    order_date DATE NOT NULL,
    count      INT NOT NULL DEFAULT 0,
    PRIMARY KEY (fbo_id, order_date)
);

CREATE OR REPLACE FUNCTION generate_daily_token(p_fbo_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO daily_counters (fbo_id, order_date, count)
    VALUES (p_fbo_id, CURRENT_DATE, 1)
    ON CONFLICT (fbo_id, order_date)
    DO UPDATE SET count = daily_counters.count + 1
    RETURNING count INTO v_count;

    RETURN 'T-' || LPAD(v_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- 5. AUDIT LOG
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id        UUID,
    actor_user_id UUID,          -- user UUID from main DB (no FK)
    action        VARCHAR(100) NOT NULL,
    target_table  VARCHAR(50),
    target_id     UUID,
    details       JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 6. INDEXES
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_categories_fbo    ON categories(fbo_id, is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_fbo     ON menu_items(fbo_id, is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_cat     ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_fbo_status  ON orders(fbo_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_fbo_created ON orders(fbo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_client_ref  ON orders(client_reference_id);
CREATE INDEX IF NOT EXISTS idx_sessions_fbo       ON table_sessions(fbo_id, status);
CREATE INDEX IF NOT EXISTS idx_fbo_tables_token   ON fbo_tables(signed_token);
CREATE INDEX IF NOT EXISTS idx_audit_fbo          ON audit_log(fbo_id, created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- 7. UPDATED_AT TRIGGERS
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY
-- All writes come through your Next.js service-role key so RLS
-- is intentionally permissive here (service role bypasses RLS).
-- We still enable it so anon/JWT callers cannot read raw data.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fbo_tables     ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log      ENABLE ROW LEVEL SECURITY;

-- Public (anon) read for active categories and available menu items
-- (customer-facing QR menu — no auth token)
CREATE POLICY "anon_read_categories" ON categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "anon_read_menu_items" ON menu_items
    FOR SELECT USING (is_available = true);

-- All other operations require service_role (server-side API routes only)
-- Service role bypasses RLS automatically — no extra policies needed.

-- ──────────────────────────────────────────────────────────────
-- 9. REALTIME (KDS live updates)
-- ──────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;

-- ──────────────────────────────────────────────────────────────
-- 10. STORAGE BUCKET — menu-images
-- ──────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,             -- public so image URLs work without a signed token
  5242880,          -- 5 MB max per image
  ARRAY['image/jpeg','image/png','image/webp','image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: public read
CREATE POLICY "Public read menu-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

-- Storage RLS: authenticated (service-role) upload / delete
CREATE POLICY "Service upload menu-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Service delete menu-images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'menu-images');

CREATE POLICY "Service update menu-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'menu-images');

-- ──────────────────────────────────────────────────────────────
-- DONE — set MENU_SUPABASE_URL and MENU_SUPABASE_SERVICE_KEY
-- env vars in your Next.js project to connect to this DB.
-- ──────────────────────────────────────────────────────────────
