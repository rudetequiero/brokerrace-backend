-- BrokerRace - migration 001: click_events
-- Run this once in the Neon SQL Editor before deploying the updated /api/click route.
-- Adds the audit log the antifraude pass needs: every click attempt (counted or not) is
-- logged, so anomalous spikes can be reviewed later (per the legal pack's checklist item
-- "Log de referral y sesion para poder auditar picos anomalos mas adelante").

create table if not exists click_events (
    id          uuid primary key default gen_random_uuid(),
    company_id  uuid references companies(id) on delete cascade,
    ip_hash     text,
    user_agent  text,
    referrer    text,
    counted     boolean not null default false,
    reason      text not null default 'ok',
    created_at  timestamptz not null default now()
  );

create index if not exists idx_click_events_company_created on click_events (company_id, created_at desc);
create index if not exists idx_click_events_ip_created on click_events (ip_hash, created_at desc);
