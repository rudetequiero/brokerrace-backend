import { sql, centsToNumber } from "./db";
import type { LeaderboardRow, CompanyRow } from "./types";

/**
 * Pricing knobs — deliberately environment variables, not hardcoded, because this is
 * still an open decision (see the launch playbook / pricing doc): outbid.lol uses a
 * $1–5 minimum, but BrokerRace's institutional positioning argues for something higher
 * (e.g. $250 entry / $25 increment). Change these in Vercel's Environment Variables
 * without touching code, and without redeploying the frontend.
 */
export function getMinBidRulesCents() {
  const minEntryCents = parseInt(process.env.MIN_ENTRY_CENTS ?? "100", 10); // default $1, matches current design mock
  const minIncrementCents = parseInt(process.env.MIN_INCREMENT_CENTS ?? "100", 10); // default $1
  return { minEntryCents, minIncrementCents };
}

/**
 * The minimum amount (in cents) that must be charged RIGHT NOW to place/raise a bid.
 * This is always computed server-side from the database — never trust a client-submitted
 * price (see PAYMENTS.md).
 */
export function computeRequiredAmountCents(currentBidCents: number): number {
  const { minEntryCents, minIncrementCents } = getMinBidRulesCents();
  return currentBidCents === 0 ? minEntryCents : minIncrementCents;
}

function fmtMoney(cents: number): string {
  return "$" + Math.round(cents / 100).toLocaleString("en-US");
}

/**
 * Current standings, optionally filtered to one category. Includes a 24h "delta" figure
 * (how much of the current bid was paid in the last 24h) used for the ▲/▼ indicator and
 * the ticker — mirrors the "Today" rolling-window concept from the design brief.
 */
export async function getLeaderboard(category?: string): Promise<LeaderboardRow[]> {
  // current_bid_cents > 0 excludes companies that were created (POST /api/companies)
  // but never completed a payment — a listing must never appear on the public
  // leaderboard "for free" while its first Stripe Checkout is pending/abandoned.
  const { rows: companies } = category && category !== "GLOBAL"
    ? await sql<CompanyRow>`
        select * from companies
        where category = ${category} and current_bid_cents > 0
        order by current_bid_cents desc, created_at asc
      `
    : await sql<CompanyRow>`
        select * from companies
        where current_bid_cents > 0
        order by current_bid_cents desc, created_at asc
      `;

  const { rows: deltas } = await sql<{ company_id: string; delta_cents: string }>`
    select company_id, coalesce(sum(amount_cents), 0) as delta_cents
    from bids
    where status = 'PAID' and paid_at >= now() - interval '24 hours'
    group by company_id
  `;
  const deltaByCompany = new Map(deltas.map((d) => [d.company_id, centsToNumber(d.delta_cents)]));

  return companies.map((c, i) => {
    const bidCents = centsToNumber(c.current_bid_cents);
    const deltaCents = deltaByCompany.get(c.id) ?? 0;
    return {
      rank: i + 1,
      id: c.id,
      slug: c.slug,
      name: c.name,
      category: c.category,
      categoryLabel: c.category_label,
      country: c.country,
      verified: c.verification_level !== "UNVERIFIED",
      verificationLevel: c.verification_level,
      bidCents,
      bidLabel: fmtMoney(bidCents),
      delta24hCents: deltaCents,
      deltaLabel: deltaCents > 0 ? `+${fmtMoney(deltaCents)}` : deltaCents < 0 ? fmtMoney(deltaCents) : "—  $0",
      clicks: centsToNumber(c.total_clicks),
      initials: c.initials ?? c.name.slice(0, 3).toUpperCase(),
      logoUrl: c.logo_url ?? null,
      website: c.website ?? null,
    };
  });
}

export async function recordActivity(eventText: string, companyId?: string) {
  await sql`
    insert into activity_log (event_text, company_id)
    values (${eventText}, ${companyId ?? null})
  `;
  // Keep the feed bounded so it doesn't grow forever.
  await sql`
    delete from activity_log
    where id not in (select id from activity_log order by created_at desc limit 200)
  `;
}
