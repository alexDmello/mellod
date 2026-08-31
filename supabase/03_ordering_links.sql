-- ============================================================
-- MELLOD — ORDERING LINKS TABLE
-- Run this in your MENU DB (bvebxcvbndkvlhavhlji).
-- Adds permanent, database-stored ordering links for walk-in
-- customers and per-table QR codes.
-- ============================================================

-- Drop old partial-index constraints if re-running
DROP INDEX IF EXISTS idx_one_active_walkin_per_fbo;
DROP INDEX IF EXISTS idx_one_active_link_per_table;

CREATE TABLE IF NOT EXISTS ordering_links (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fbo_id       UUID NOT NULL,
    type         VARCHAR(20) NOT NULL CHECK (type IN ('walk_in', 'table')),
    table_id     UUID REFERENCES fbo_tables(id) ON DELETE SET NULL,
    label        VARCHAR(100) NOT NULL,
    token        TEXT UNIQUE NOT NULL,
    full_url     TEXT NOT NULL,
    is_active    BOOLEAN DEFAULT true NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup by token (only active rows — the common case)
CREATE INDEX IF NOT EXISTS idx_ordering_links_token_active
    ON ordering_links(token) WHERE is_active = true;

-- List all links for an FBO dashboard view
CREATE INDEX IF NOT EXISTS idx_ordering_links_fbo_active
    ON ordering_links(fbo_id, is_active);

-- Exactly one active walk-in link per FBO
CREATE UNIQUE INDEX idx_one_active_walkin_per_fbo
    ON ordering_links(fbo_id)
    WHERE type = 'walk_in' AND is_active = true;

-- Exactly one active link per table
CREATE UNIQUE INDEX idx_one_active_link_per_table
    ON ordering_links(table_id)
    WHERE type = 'table' AND is_active = true AND table_id IS NOT NULL;

-- RLS: public can read active links (for token resolution)
ALTER TABLE ordering_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_active_links" ON ordering_links
    FOR SELECT USING (is_active = true);

-- Service role can do everything (API uses service key)
CREATE POLICY "service_full_access" ON ordering_links
    FOR ALL USING (true) WITH CHECK (true);

-- Realtime (optional — link regeneration will update the dashboard live)
ALTER PUBLICATION supabase_realtime ADD TABLE ordering_links;
