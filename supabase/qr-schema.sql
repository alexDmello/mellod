-- ============================================================
-- MELLOD QR ORDERING PLATFORM — SUPABASE SCHEMA (HARDENED)
-- Run this in the Supabase SQL Editor in order.
-- ============================================================

-- Enable pgcrypto for column-level encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ──────────────────────────────────────────────────────────────
-- 1. TENANTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id                  UUID REFERENCES fbos(id) ON DELETE SET NULL,
    slug                    VARCHAR(50) UNIQUE NOT NULL,
    business_name           VARCHAR(255) NOT NULL,
    owner_name              VARCHAR(255) NOT NULL,
    phone                   VARCHAR(20) NOT NULL,
    brand_color             VARCHAR(7) DEFAULT '#6366f1',
    logo_url                TEXT,
    operational_mode        VARCHAR(20) DEFAULT 'hybrid'
                            CHECK (operational_mode IN ('dine_in','counter_qsr','hybrid')),
    allow_pay_later         BOOLEAN DEFAULT false,
    merchant_upi_id         VARCHAR(100),
    bank_account_encrypted  BYTEA,             -- pgcrypto column-level encryption
    fssai_license           VARCHAR(14),
    gstin                   VARCHAR(15),
    max_order_amount_alert  NUMERIC(10,2),
    token_signing_salt      TEXT NOT NULL,     -- per-tenant HMAC salt
    is_active               BOOLEAN DEFAULT true,
    store_hours             JSONB,             -- {mon:{open:"09:00",close:"22:00"}, ...}
    table_count             INT DEFAULT 0,
    payout_mode             VARCHAR(20) DEFAULT 'direct_upi'
                            CHECK (payout_mode IN ('direct_upi','platform_gateway')),
    dpdp_consent            BOOLEAN DEFAULT false,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 2. STAFF / USER PROFILES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = super_admin
    role        VARCHAR(20) NOT NULL DEFAULT 'counter_staff'
                CHECK (role IN ('super_admin','fbo_owner','counter_staff')),
    full_name   VARCHAR(255),
    mfa_enabled BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 3. TABLES & SIGNED TOKENS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fbo_tables (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID REFERENCES tenants(id) ON DELETE CASCADE,
    table_number     VARCHAR(20) NOT NULL,
    signed_token     TEXT UNIQUE NOT NULL,
    token_issued_at  TIMESTAMPTZ DEFAULT NOW(),
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, table_number)
);

-- ──────────────────────────────────────────────────────────────
-- 4. TABLE SESSIONS (TABS)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS table_sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
    table_id   UUID REFERENCES fbo_tables(id) ON DELETE SET NULL,
    status     VARCHAR(20) DEFAULT 'open'
               CHECK (status IN ('open','flagged','settled')),
    opened_at  TIMESTAMPTZ DEFAULT NOW(),
    closed_at  TIMESTAMPTZ
);

-- ──────────────────────────────────────────────────────────────
-- 5. CATEGORIES & MENU ITEMS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active  BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS menu_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    price       NUMERIC(10,2) NOT NULL,
    image_url   TEXT,
    is_veg      BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 6. ORDERS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID REFERENCES tenants(id) ON DELETE CASCADE,
    table_session_id      UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
    order_type            VARCHAR(20) NOT NULL
                          CHECK (order_type IN ('table','counter')),
    token_number          VARCHAR(20),
    client_reference_id   TEXT UNIQUE NOT NULL,  -- idempotency key
    status                VARCHAR(30) DEFAULT 'pending_payment'
                          CHECK (status IN (
                            'pending_payment','received','preparing',
                            'ready','completed','cancelled'
                          )),
    payment_status        VARCHAR(20) DEFAULT 'unpaid'
                          CHECK (payment_status IN ('unpaid','paid','failed','refunded')),
    payment_method        VARCHAR(30)
                          CHECK (payment_method IN (
                            'online_pg','direct_upi_manual','cash', NULL
                          )),
    gateway_transaction_id TEXT UNIQUE,          -- webhook idempotency guard
    total_amount          NUMERIC(10,2) NOT NULL, -- server-computed, NEVER client-trusted
    notes                 TEXT,
    cancelled_reason      TEXT,
    cancelled_by          UUID REFERENCES auth.users(id),
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 7. ORDER ITEMS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id             UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id         UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name            VARCHAR(255) NOT NULL,   -- snapshotted at order time
    quantity             INT NOT NULL CHECK (quantity > 0),
    unit_price           NUMERIC(10,2) NOT NULL,  -- snapshotted server-side
    customization_details JSONB
);

-- ──────────────────────────────────────────────────────────────
-- 8. ATOMIC DAILY COUNTERS (race-safe token generation)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_counters (
    tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
    order_date DATE NOT NULL,
    count      INT NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, order_date)
);

CREATE OR REPLACE FUNCTION generate_daily_token(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO daily_counters (tenant_id, order_date, count)
    VALUES (p_tenant_id, CURRENT_DATE, 1)
    ON CONFLICT (tenant_id, order_date)
    DO UPDATE SET count = daily_counters.count + 1
    RETURNING count INTO v_count;

    RETURN 'T-' || LPAD(v_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- 9. AUDIT LOG
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES auth.users(id),
    action        VARCHAR(100) NOT NULL,
    target_table  VARCHAR(50),
    target_id     UUID,
    details       JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_client_ref ON orders(client_reference_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant ON menu_items(tenant_id, is_available);
CREATE INDEX IF NOT EXISTS idx_table_sessions_tenant_status ON table_sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fbo_tables_token ON fbo_tables(signed_token);

-- ──────────────────────────────────────────────────────────────
-- AUTO-UPDATED updated_at TRIGGER
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- AUTO-FLAG STALE TABLE SESSIONS
-- Runs as a Supabase Edge Function cron job or pg_cron.
-- This is here for documentation — run via pg_cron in production.
-- ──────────────────────────────────────────────────────────────
-- SELECT cron.schedule('flag-stale-sessions', '*/15 * * * *', $$
--   UPDATE table_sessions
--   SET status = 'flagged'
--   WHERE status = 'open'
--     AND opened_at < NOW() - INTERVAL '3 hours';
-- $$);

-- ──────────────────────────────────────────────────────────────
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ──────────────────────────────────────────────────────────────
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fbo_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ──────────────────────────────────────────────────────────────

-- Helper: resolve the calling user's role and tenant_id from user_profiles
-- (used in policies below)

-- ── TENANTS ──
-- Super admin: full access
CREATE POLICY "super_admin_tenants_all" ON tenants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- FBO owner: read own tenant row only
CREATE POLICY "fbo_owner_tenants_select" ON tenants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND role = 'fbo_owner'
              AND tenant_id = tenants.id
        )
    );

-- ── USER_PROFILES ──
CREATE POLICY "super_admin_profiles_all" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'super_admin'
        )
    );

CREATE POLICY "fbo_owner_profiles_tenant" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
              AND up.role = 'fbo_owner'
              AND up.tenant_id = user_profiles.tenant_id
        )
    );

CREATE POLICY "own_profile_select" ON user_profiles
    FOR SELECT USING (id = auth.uid());

-- ── CATEGORIES & MENU ITEMS (public read for customers) ──
CREATE POLICY "anon_categories_select" ON categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "anon_menu_items_select" ON menu_items
    FOR SELECT USING (is_available = true);

-- FBO owners can CRUD their own tenant's items
CREATE POLICY "fbo_owner_categories_crud" ON categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND role IN ('fbo_owner','super_admin')
              AND (tenant_id = categories.tenant_id OR role = 'super_admin')
        )
    );

CREATE POLICY "fbo_owner_menu_items_crud" ON menu_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND role IN ('fbo_owner','super_admin')
              AND (tenant_id = menu_items.tenant_id OR role = 'super_admin')
        )
    );

-- counter_staff: can toggle is_available only
CREATE POLICY "staff_menu_items_toggle" ON menu_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND role = 'counter_staff'
              AND tenant_id = menu_items.tenant_id
        )
    )
    WITH CHECK (true);

-- ── FBO_TABLES ──
CREATE POLICY "staff_tables_select" ON fbo_tables
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND tenant_id = fbo_tables.tenant_id
        )
    );

CREATE POLICY "owner_tables_all" ON fbo_tables
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND role IN ('fbo_owner','super_admin')
              AND (tenant_id = fbo_tables.tenant_id OR role = 'super_admin')
        )
    );

-- ── TABLE_SESSIONS ──
CREATE POLICY "staff_sessions_tenant" ON table_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND tenant_id = table_sessions.tenant_id
        )
    );

-- ── ORDERS (no direct client insert — all writes go through service role via Edge Functions) ──
CREATE POLICY "staff_orders_tenant" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND tenant_id = orders.tenant_id
        )
    );

-- counter_staff: can UPDATE status only (not payment fields, not revenue aggregates)
CREATE POLICY "staff_orders_update_status" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND role = 'counter_staff'
              AND tenant_id = orders.tenant_id
        )
    )
    WITH CHECK (
        -- counter_staff may only change status & notes, not payment fields
        total_amount = orders.total_amount
        AND payment_status = orders.payment_status
        AND gateway_transaction_id IS NOT DISTINCT FROM orders.gateway_transaction_id
    );

-- fbo_owner: full update within their tenant
CREATE POLICY "owner_orders_update" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND role IN ('fbo_owner','super_admin')
              AND (tenant_id = orders.tenant_id OR role = 'super_admin')
        )
    );

-- ── ORDER_ITEMS ──
CREATE POLICY "staff_order_items_select" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN user_profiles up ON up.tenant_id = o.tenant_id
            WHERE o.id = order_items.order_id
              AND up.id = auth.uid()
        )
    );

-- ── AUDIT LOG (append-only for staff, full for admins) ──
CREATE POLICY "staff_audit_select" ON audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND (tenant_id = audit_log.tenant_id OR role = 'super_admin')
        )
    );

-- ── DAILY COUNTERS (service role only — no direct client access) ──
-- No policies needed beyond the function SECURITY DEFINER above
-- The table is only written to by generate_daily_token()

-- ──────────────────────────────────────────────────────────────
-- REALTIME: enable for KDS live updates
-- ──────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;
