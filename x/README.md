# Routes Management — redesign notes

## Why this needed more than a visual refresh

The original page had two solid tabs (Daily Dispatch Board, Route Templates) and clean CRUD
for grouping restaurants into named routes. But "Quick Dispatch" always sent **every** stop in
a route to the picker, every time it ran. That's fine if a route is meant to be walked daily —
it breaks the moment collection is "once or twice a month per restaurant," because there was no
concept anywhere of *when a restaurant was last visited* or *when it's due again*. Run Quick
Dispatch daily on a route and you'd send someone to the same restaurant every single day.

So the core of this redesign is a due-status engine: every FBO gets a collection frequency and a
last-collected date, and the dispatch board now shows — and pre-selects — only what's actually
due. Everything else (multi-picker assignment, splitting a zone when you add headcount, seeing
who's overloaded) builds on top of that.

## File layout

```
app/dashboard/routes/
  page.tsx                  <- route entry (thin wrapper)
  RoutesManagementTab.tsx   <- tab switcher + shared notifications
  DispatchBoard.tsx         <- Tab 1: Today's Dispatch
  RouteZonesTab.tsx         <- Tab 2: Zones & Schedules
  PickersTab.tsx            <- Tab 3: Pickers & Workload
  route-badges.tsx          <- 2 tiny shared presentational components
  route-utils.ts            <- types + due-status math (no React, no Supabase — pure logic)
  use-routes-data.ts        <- every Supabase read/write for this feature, as one hook
migration.sql                <- run this in the Supabase SQL editor first
```

Drop the `app/dashboard/routes/` files into wherever your actual routes page lives — the folder
name doesn't matter, they only import from each other with relative paths (`./route-utils`
etc.), plus your existing `@/lib/supabase/client`, `@/lib/utils`, and `@/lib/types`, exactly like
the original file did. Nothing outside this folder needs to change.

I split one 880-line file into eight smaller ones on purpose: `route-utils.ts` is pure
math you can unit test without a database, `use-routes-data.ts` is every Supabase call in one
place instead of scattered through JSX, and each tab is small enough to hold in your head. If
you'd rather keep it as fewer files, the split points are clean — nothing stops you merging them
back.

## Setup

1. **Run `migration.sql`** in the Supabase SQL editor. It only adds columns/indexes/a trigger —
   nothing existing is renamed or dropped.
2. Everything else is additive to `fbos`, `routes`, and `pickers`, so no other part of your app
   should break. The one thing to double check: if your WhatsApp bot already writes an
   "early pickup requested" flag somewhere, point `early_pickup_requested_at` at that same flow
   (or rename the column to match) instead of running two separate signals.
3. New badge colors (`badge-red`, `badge-blue`) are used alongside your existing `badge-gray` /
   `badge-yellow` / `badge-green`. If those two aren't already in your global CSS, add them
   following whatever pattern the existing three use.

## How this maps to the three scenarios you described

**"I'll have multiple pickers, assigning a route to each one daily."**
This was already close to working — I kept the shape (zones = geographic groupings, a picker
does a zone on a given day) but made the assignment itself due-aware. On the Dispatch tab, each
zone card shows a picker dropdown (pre-filled with that zone's default picker, overridable per
day) and a "Dispatch Selected" button. You're still assigning a zone to a picker for the day, but
what gets dispatched is only what's actually due, not the full static list.

**"Collection at one restaurant is only once or twice a month."**
This is the due-status engine in `route-utils.ts`. Every FBO gets a `collection_frequency_days`
(set per restaurant in the Zones tab — presets for weekly / twice-a-month / monthly / custom) and
a `last_collected_at`, which updates itself the moment you mark a stop "collected" on the
Dispatch tab (a database trigger keeps this in sync even if something other than this page
writes to `routes` later, e.g. a future picker-facing app). Each restaurant then carries its own
badge — Never collected, Overdue, Due today, Due in 2d, Not due — computed relative to whatever
date you're viewing, and only the due ones are pre-checked for dispatch. Nothing forces a
restaurant onto the board before it's actually due.

**"What if I add another picker once FBO count is stable?"**
Two pieces work together:
- **Zones tab → bulk move.** Check a handful of stops in an existing zone, pick (or create
  inline) a destination zone, hit Move. Create the new zone, set the new picker as its default,
  move over the stops that make sense geographically — no re-adding restaurants one at a time.
- **Pickers tab.** Shows each picker's stop count today and this week, plus a "near capacity"
  flag once someone's daily count reaches their configured limit. That's the signal for *when*
  it's time, before routes get so overloaded that pickups start slipping.
  Note: creating the new picker's actual login still belongs wherever you handle staff accounts
  today (Supabase Auth invite, or however the picker/profile rows get created) — I didn't wire
  that up here since I can't see that part of your schema, and guessing at it risked shipping
  something that either fails on your foreign keys or quietly creates unusable accounts. Once
  the row exists, it shows up in the Pickers tab automatically.

## Other things worth knowing

- **Mark Collected / Skip** live on the Dispatch tab, on any stop already dispatched for the
  selected date. Mark Collected takes an optional litres number (feeds the trigger that updates
  `last_collected_at`); Skip records that the picker didn't collect without touching the
  schedule.
- **Per-row loading states.** Actions now track a `pendingIds` set instead of one global
  `loading` boolean, so clicking "collected" on one stop doesn't grey out every button on the
  board — this matters more now that there's more to click on any given day.
- **Stale-data fix:** the original embedded a joined `fbo` object on each route stop at fetch
  time. Once FBO data changes constantly (frequency edits, last-collected updates), that snapshot
  goes stale immediately. Stops now just carry `fbo_id`; components look the FBO up from a live
  map instead.
- **Dead import removed:** `UserX` was imported in the original file but never used (it's used
  now, for the deactivate-picker button).
- **Not addressed here, flagged on purpose:** RLS is still off on these tables, per your last
  audit. This migration doesn't make that better or worse — it's worth its own pass once your
  admin/picker/FBO auth roles are settled, rather than guessing at policies blind here.

## Reasonable next phase, not built yet

- A week-ahead calendar view (right now you plan one date at a time — fine at current scale,
  worth revisiting once you're juggling 5+ zones).
- Real map view for splitting a zone geographically instead of by list — `places_search` /
  `places_map_display` could plug in here later if useful, e.g. to eyeball a cluster before
  bulk-moving it.
- Route distance/sequence optimization (currently manual up/down ordering, same as the original).
