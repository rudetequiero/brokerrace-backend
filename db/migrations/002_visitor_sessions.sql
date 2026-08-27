-- BrokerRace - migration 002: visitor_sessions
-- Run this once in the Neon SQL Editor before deploying the new /api/visit and /api/stats
-- routes. Powers the "N viewing now - M total visitors" counter in the LIVE MARKET strip.
--
-- One row per browser (client-generated session id, stored in localStorage), upserted on
-- every heartbeat. This intentionally is NOT an ever-growing log table - it stays exactly
-- one row per visitor forever, so "total visitors" and "live now" are both cheap, accurate
-- counts with no pruning job needed.

create table if not exists visitor_sessions (
    session_id  text primary key,
    first_seen  timestamptz not null default now(),
    last_seen   timestamptz not null default now(),
    visit_count integer not null default 1
  );

create index if not exists idx_visitor_sessions_last_seen on visitor_sessions (last_seen desc);
