import { sql } from "@/lib/db";
import { corsJson, corsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic"; // always read fresh counts, never statically cache

/**
 * GET /api/stats
 *
 * Powers the "N viewing now - M total visitors" counter in the LIVE MARKET strip. Polled
 * from the frontend every ~12s (see `fetchStats()` alongside the existing `_liveTimer`).
 *
 * - totalVisitors: all-time distinct browsers that have ever sent a heartbeat (one row
 *   per session_id in visitor_sessions, see db/migrations/002_visitor_sessions.sql).
 * - liveNow: sessions whose most recent heartbeat was within the last 90 seconds. The
 *   frontend heartbeats every ~25s, so 90s comfortably survives one missed beat (a slow
 *   network tick, a brief tab-backgrounding throttle) without a visitor flickering out of
 *   the count, while still dropping someone who actually left within about a minute.
 */
export async function GET() {
    const { rows } = await sql<{ total_visitors: string; live_now: string }>`
        select
              count(*)::text as total_visitors,
                    count(*) filter (where last_seen >= now() - interval '90 seconds')::text as live_now
                        from visitor_sessions
                          `;

  const totalVisitors = parseInt(rows[0]?.total_visitors ?? "0", 10);
    const liveNow = parseInt(rows[0]?.live_now ?? "0", 10);

  return corsJson({ totalVisitors, liveNow });
}

export async function OPTIONS() {
    return corsPreflight();
}
