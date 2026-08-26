import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/market";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic"; // always read fresh data, never statically cache

/**
 * GET /api/leaderboard?category=CRYPTO
 * GET /api/leaderboard              -> GLOBAL (all categories)
 *
 * This is what should replace the hardcoded `SEED` array in Outbid Platform.dc.html
 * once the frontend is wired to real data — see the integration note in README.md.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;

  const [rows, recentActivity] = await Promise.all([
    getLeaderboard(category),
    sql`
      select event_text, created_at
      from activity_log
      order by created_at desc
      limit 8
    `,
  ]);

  return NextResponse.json({
    category: category ?? "GLOBAL",
    rows,
    activity: recentActivity.rows,
    stats: {
      totalBidVolumeCents: rows.reduce((sum, r) => sum + r.bidCents, 0),
      activeBidders: rows.length,
      topBidCents: rows[0]?.bidCents ?? 0,
    },
  });
}
