// One-off local/dev seed script — loads the same 30 demo companies used in the
// Claude Design mockup's SEED array (Outbid Platform.dc.html) so the real backend
// starts out matching what's already been shown to people as the "DEMO" market.
//
// Run with:  npm run seed
// (reads POSTGRES_URL from .env.local — see .env.example)
//
// IMPORTANT: this is for local/dev/demo databases only. Do NOT run this against your
// production database — real launch data should start empty (see the "LIVE vs DEMO"
// note in README.md: seeding fake companies into a real, public leaderboard would be
// misleading, not just a demo).

import { sql } from "../lib/db";

type Seed = {
  id: string;
  name: string;
  category: "CRYPTO" | "FOREX" | "STOCKS" | "CFD" | "PROP" | "FINTECH";
  categoryLabel: string;
  country: string;
  bid: number; // dollars
  clicks: number;
  verified: boolean;
};

const CATEGORY_LABELS: Record<Seed["category"], string> = {
  CRYPTO: "Crypto Exchange",
  FOREX: "Forex Broker",
  STOCKS: "Stock Broker",
  CFD: "CFD / Derivatives",
  PROP: "Prop Firm",
  FINTECH: "Fintech / Investment",
};

const SEED: Seed[] = [
  { id: "vantex", name: "VANTEX", category: "CRYPTO", categoryLabel: CATEGORY_LABELS.CRYPTO, country: "Cayman Islands", bid: 18420, clicks: 32481, verified: true },
  { id: "novexa", name: "NOVEXA", category: "CRYPTO", categoryLabel: CATEGORY_LABELS.CRYPTO, country: "Singapore", bid: 9640, clicks: 14210, verified: true },
  { id: "aurix", name: "AURIX", category: "CRYPTO", categoryLabel: CATEGORY_LABELS.CRYPTO, country: "Malta", bid: 7120, clicks: 9870, verified: false },
  { id: "kryptoniq", name: "KRYPTONIQ", category: "CRYPTO", categoryLabel: CATEGORY_LABELS.CRYPTO, country: "UAE", bid: 6300, clicks: 8120, verified: true },
  { id: "nexora", name: "NEXORA", category: "CRYPTO", categoryLabel: CATEGORY_LABELS.CRYPTO, country: "Switzerland", bid: 5400, clicks: 6410, verified: false },
  { id: "alphora", name: "ALPHORA MARKETS", category: "FOREX", categoryLabel: CATEGORY_LABELS.FOREX, country: "United Kingdom", bid: 17950, clicks: 21204, verified: true },
  { id: "veltrix", name: "VELTRIX FX", category: "FOREX", categoryLabel: CATEGORY_LABELS.FOREX, country: "Cyprus", bid: 10200, clicks: 15200, verified: true },
  { id: "northstar", name: "NORTHSTAR CAPITAL", category: "FOREX", categoryLabel: CATEGORY_LABELS.FOREX, country: "Australia", bid: 8900, clicks: 11300, verified: true },
  { id: "apextrade", name: "APEXTRADE", category: "FOREX", categoryLabel: CATEGORY_LABELS.FOREX, country: "Seychelles", bid: 7600, clicks: 9200, verified: false },
  { id: "meridian", name: "MERIDIAN FX", category: "FOREX", categoryLabel: CATEGORY_LABELS.FOREX, country: "United Kingdom", bid: 6100, clicks: 7100, verified: false },
  { id: "nova", name: "NOVA SECURITIES", category: "STOCKS", categoryLabel: CATEGORY_LABELS.STOCKS, country: "United States", bid: 15800, clicks: 18921, verified: true },
  { id: "arbor", name: "ARBOR TRADE", category: "STOCKS", categoryLabel: CATEGORY_LABELS.STOCKS, country: "Germany", bid: 9800, clicks: 12100, verified: true },
  { id: "vectoris", name: "VECTORIS", category: "STOCKS", categoryLabel: CATEGORY_LABELS.STOCKS, country: "United States", bid: 8200, clicks: 9600, verified: false },
  { id: "crownmarkets", name: "CROWNMARKETS", category: "STOCKS", categoryLabel: CATEGORY_LABELS.STOCKS, country: "Hong Kong", bid: 6900, clicks: 7400, verified: true },
  { id: "helix", name: "HELIX INVEST", category: "STOCKS", categoryLabel: CATEGORY_LABELS.STOCKS, country: "Canada", bid: 5700, clicks: 6200, verified: false },
  { id: "titanedge", name: "TITANEDGE", category: "CFD", categoryLabel: CATEGORY_LABELS.CFD, country: "United Kingdom", bid: 12650, clicks: 12442, verified: true },
  { id: "vortex", name: "VORTEX CAPITAL", category: "CFD", categoryLabel: CATEGORY_LABELS.CFD, country: "Cyprus", bid: 9100, clicks: 9900, verified: false },
  { id: "primevector", name: "PRIMEVECTOR", category: "CFD", categoryLabel: CATEGORY_LABELS.CFD, country: "Australia", bid: 7800, clicks: 8300, verified: true },
  { id: "axion", name: "AXION DERIVATIVES", category: "CFD", categoryLabel: CATEGORY_LABELS.CFD, country: "UAE", bid: 6600, clicks: 6900, verified: false },
  { id: "blackridge", name: "BLACKRIDGE MARKETS", category: "CFD", categoryLabel: CATEGORY_LABELS.CFD, country: "Switzerland", bid: 5900, clicks: 6100, verified: true },
  { id: "ironpeak", name: "IRONPEAK TRADING", category: "PROP", categoryLabel: CATEGORY_LABELS.PROP, country: "United States", bid: 11900, clicks: 9812, verified: true },
  { id: "apexforge", name: "APEXFORGE", category: "PROP", categoryLabel: CATEGORY_LABELS.PROP, country: "United Kingdom", bid: 8700, clicks: 7600, verified: false },
  { id: "capitalcore", name: "CAPITALCORE", category: "PROP", categoryLabel: CATEGORY_LABELS.PROP, country: "Germany", bid: 7300, clicks: 6500, verified: true },
  { id: "vanguardedge", name: "VANGUARD EDGE", category: "PROP", categoryLabel: CATEGORY_LABELS.PROP, country: "Canada", bid: 6400, clicks: 5700, verified: false },
  { id: "tradera", name: "TRADERA CAPITAL", category: "PROP", categoryLabel: CATEGORY_LABELS.PROP, country: "Singapore", bid: 5200, clicks: 4800, verified: false },
  { id: "orbital", name: "ORBITAL FINANCE", category: "FINTECH", categoryLabel: CATEGORY_LABELS.FINTECH, country: "United States", bid: 10500, clicks: 13100, verified: true },
  { id: "nexus", name: "NEXUS INVEST", category: "FINTECH", categoryLabel: CATEGORY_LABELS.FINTECH, country: "United Kingdom", bid: 8300, clicks: 9700, verified: true },
  { id: "arcline", name: "ARCLINE", category: "FINTECH", categoryLabel: CATEGORY_LABELS.FINTECH, country: "Estonia", bid: 7000, clicks: 7900, verified: false },
  { id: "lumen", name: "LUMEN CAPITAL", category: "FINTECH", categoryLabel: CATEGORY_LABELS.FINTECH, country: "Netherlands", bid: 6200, clicks: 6600, verified: true },
  { id: "quantera", name: "QUANTERA", category: "FINTECH", categoryLabel: CATEGORY_LABELS.FINTECH, country: "Singapore", bid: 4900, clicks: 5200, verified: false },
];

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 3).join("").toUpperCase();
}

async function main() {
  console.log(`Seeding ${SEED.length} demo companies...`);
  for (const c of SEED) {
    const bidCents = Math.round(c.bid * 100);
    await sql`
      insert into companies (
        slug, name, category, category_label, country, initials,
        verification_level, current_bid_cents, total_clicks
      ) values (
        ${c.id}, ${c.name}, ${c.category}, ${c.categoryLabel}, ${c.country}, ${initials(c.name)},
        ${c.verified ? "VERIFIED_COMPANY" : "UNVERIFIED"}, ${bidCents}, ${c.clicks}
      )
      on conflict (slug) do update set
        current_bid_cents = excluded.current_bid_cents,
        total_clicks = excluded.total_clicks
    `;
  }
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
