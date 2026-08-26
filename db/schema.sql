-- BrokerRace — core schema
-- Run this once against your Postgres database (Vercel Postgres / Neon / Supabase all work).
-- Money is stored in cents (integer) everywhere to avoid floating-point rounding bugs.

create extension if not exists "pgcrypto";

create table if not exists companies (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,               -- url-safe id, e.g. "vantex"
  name                text not null,
  category            text not null,                       -- CRYPTO | FOREX | STOCKS | CFD | PROP | FINTECH
  category_label      text not null,                        -- "Crypto Exchange", etc. (display label)
  country             text,
  website             text,
  initials             text,                                 -- short avatar label, e.g. "VTX"
  logo_url             text,                                 -- direct image URL shown on the podium + table row, in place of initials
  verification_level  text not null default 'UNVERIFIED',   -- UNVERIFIED | IDENTITY_VERIFIED | VERIFIED_COMPANY | VERIFIED_BROKER | VERIFIED_EXCHANGE | LICENSE_VERIFIED
  current_bid_cents   bigint not null default 0,             -- cumulative confirmed bid (source of truth for rank)
  total_clicks        bigint not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_companies_category on companies (category);
create index if not exists idx_companies_current_bid on companies (current_bid_cents desc);

-- One row per bid attempt. This is the audit trail / ledger — companies.current_bid_cents
-- is a maintained cache that should always be derivable by summing status='PAID' rows here.
create table if not exists bids (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references companies(id) on delete cascade,
  amount_cents            bigint not null check (amount_cents > 0),  -- the incremental amount charged for THIS bid
  previous_bid_cents      bigint not null,                            -- company's cumulative bid before this one
  new_total_bid_cents     bigint not null,                            -- previous_bid_cents + amount_cents
  status                  text not null default 'PENDING',
    -- PENDING | PROCESSING | PAID | FAILED | REFUNDED | DISPUTED | CHARGEBACK | CANCELLED
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id   text unique,
  internal_transaction_id    uuid not null default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  paid_at                 timestamptz
);

create index if not exists idx_bids_company on bids (company_id);
create index if not exists idx_bids_status on bids (status);
create index if not exists idx_bids_paid_at on bids (paid_at desc);

-- Idempotency ledger for Stripe webhooks — see PAYMENTS.md: "store processed Stripe event IDs;
-- ignore retried webhook deliveries."
create table if not exists processed_stripe_events (
  event_id     text primary key,
  event_type   text not null,
  processed_at timestamptz not null default now()
);

-- Feed shown in the "LIVE ACTIVITY" panel.
create table if not exists activity_log (
  id         uuid primary key default gen_random_uuid(),
  event_text text not null,
  company_id uuid references companies(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_created_at on activity_log (created_at desc);
