import { sql } from "@/lib/db";
import { corsNoContent, corsJson, corsPreflight } from "@/lib/cors";

export const runtime = "nodejs";

/**
 * POST /api/visit  { sessionId: string }
 *
 * Heartbeat called from the frontend on page load and every ~25s after (see the
 * `trackVisit()` interval added alongside the existing `_liveTimer` in
 * Outbid Platform.dc.html). Feeds /api/stats's "N viewing now - M total visitors" counter.
 *
 * `sessionId` is a random id the frontend generates once (crypto.randomUUID()) and keeps
 * in localStorage - not tied to any identity, just a stable "same browser" marker. One row
 * per session, upserted on every heartbeat, so this table never grows unbounded and both
 * "total visitors" (row count) and "live now" (rows with a recent last_seen) stay cheap.
 *
 * Same bot/crawler filter as /api/click: a bot polling this endpoint shouldn't inflate the
 * visitor count either. Unlike /api/click there's no per-IP rate limit here - a heartbeat
 * from the same session is expected roughly every 25s, and the upsert makes repeats free.
 */
const BOT_UA_PATTERN =
    /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|curl|wget|python-requests|python-urllib|axios|go-http-client|okhttp|headlesschrome|phantomjs|puppeteer|playwright|scrapy|httpclient|libwww-perl|postmanruntime/i;

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const sessionId = body && typeof body.sessionId === "string" ? body.sessionId : null;
    if (!sessionId || sessionId.length > 100) {
          return corsJson({ error: "`sessionId` is required" }, { status: 400 });
    }

  const userAgent = request.headers.get("user-agent") ?? "";
    if (!userAgent || BOT_UA_PATTERN.test(userAgent)) {
          return corsNoContent();
    }

  await sql`
      insert into visitor_sessions (session_id, first_seen, last_seen, visit_count)
          values (${sessionId}, now(), now(), 1)
              on conflict (session_id)
                  do update set last_seen = now(), visit_count = visitor_sessions.visit_count + 1
                    `;

  return corsNoContent();
}

export async function OPTIONS() {
    return corsPreflight();
}
