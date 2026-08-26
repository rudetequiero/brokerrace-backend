import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * POST /api/click  { companyId: string }
 *
 * Fires when a visitor clicks through to a listed company's website. This feeds the
 * CLICKS column and, eventually, CTR/CPC (see the launch playbook's "convert clicks
 * into analytics" priority).
 *
 * NOT abuse-resistant yet: no rate limiting, no bot/IP filtering, no dedup per visitor.
 * The legal pack's antifraude checklist (rate limiting, fingerprinting, bot filtering)
 * needs to land BEFORE this number is used for anything billing-related (a CPC benchmark,
 * a competitor-facing metric, etc.) — until then, treat total_clicks as directional only.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const companyId = body && typeof body.companyId === "string" ? body.companyId : null;
  if (!companyId) {
    return NextResponse.json({ error: "`companyId` is required" }, { status: 400 });
  }

  await sql`
    update companies set total_clicks = total_clicks + 1
    where id = ${companyId}
  `;

  return new NextResponse(null, { status: 204 });
}
