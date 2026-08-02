-- ============================================================================
-- Routes Management: scheduling & workload additions
-- ============================================================================
-- Run this in the Supabase SQL editor. Everything here is additive — no
-- existing column is renamed, retyped, or dropped, so nothing already built
-- on `fbos`, `routes`, or `pickers` should break.
--
-- Safe to re-run: every statement is written to be idempotent.
-- ============================================================================

-- 1. FBO collection cadence -------------------------------------------------
alter table fbos
  add column if not exists collection_frequency_days integer,
  add column if not exists last_collected_at date,
  add column if not exists early_pickup_requested_at timestamptz;

comment on column fbos.collection_frequency_days is
  'How often this FBO should be visited, in days (15 = twice a month, 30 = monthly). Null = not configured yet — treated as "needs setup", not auto-included in dispatch.';
comment on column fbos.last_collected_at is
  'Date of the most recent completed pickup. Kept in sync automatically by the trigger below — do not set by hand except for a one-time backfill from historical records.';
comment on column fbos.early_pickup_requested_at is
  'Set when an FBO asks for an early pickup via the WhatsApp bot. If the bot already has an equivalent field, point that flow at this column (or rename this one to match) rather than keeping two sources of truth.';

create index if not exists idx_fbos_frequency on fbos (collection_frequency_days);

-- 2. Daily assignment completion state --------------------------------------
-- `routes` already holds one row per (picker, fbo, date) — this just lets a
-- row record what actually happened, instead of only that it was assigned.
alter table routes
  add column if not exists status text not null default 'assigned',
  add column if not exists collected_liters numeric,
  add column if not exists completed_at timestamptz;

alter table routes drop constraint if exists routes_status_check;
alter table routes
  add constraint routes_status_check check (status in ('assigned', 'completed', 'skipped'));

create index if not exists idx_routes_date on routes (route_date);
create index if not exists idx_routes_picker_date on routes (picker_id, route_date);

-- 3. Picker capacity ---------------------------------------------------------
alter table pickers
  add column if not exists daily_capacity integer not null default 20;

comment on column pickers.daily_capacity is
  'Soft daily stop limit, used only to flag "near capacity" in the Pickers tab. Not enforced anywhere — tune per picker based on zone size and travel time.';

-- 4. Keep fbos.last_collected_at in sync automatically -----------------------
-- Fires whenever a routes row is marked completed, from ANY source (this
-- dashboard today, a future picker-facing app, or the WhatsApp bot backend) —
-- so last_collected_at can never drift out of sync with what actually happened.
create or replace function sync_fbo_last_collected()
returns trigger as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    update fbos
    set last_collected_at = (coalesce(new.completed_at, now()) at time zone 'Asia/Kolkata')::date,
        early_pickup_requested_at = null
    where id = new.fbo_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_fbo_last_collected on routes;
create trigger trg_sync_fbo_last_collected
  after insert or update on routes
  for each row
  execute function sync_fbo_last_collected();

-- ============================================================================
-- Not covered here, on purpose:
--
-- Row Level Security. Your last audit already flagged that fbos/routes/
-- pickers have no RLS policies. These new columns simply inherit that same
-- (lack of) policy — this migration doesn't change your exposure either way.
-- Worth treating as its own focused pass once your admin/picker/FBO auth
-- roles are finalized, rather than bolting policies on here.
-- ============================================================================
