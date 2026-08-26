import { NextResponse } from "next/server";
import { sql, centsToNumber } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { computeRequiredAmountCents } from "@/lib/market";
import type { CompanyRow } from "@/lib/types";

/**
 * POST /api/checkout
 * Body: { companyId: string, desiredTotalBidCents: number }
 *
 * "desiredTotalBidCents" is the company's target CUMULATIVE bid (what the leaderboard
 * should show once this payment clears) — e.g. if VANTEX is at $18,420 and wants to
 * defend #1 against a $18,900 challenger, desiredTotalBidCents = 1_890_100 (i.e. $18,901).
 * The frontend's "amount needed to rank #N" buttons and the free-text bid input both
 * ultimately produce this one number.
 *
 * Per PAYMENTS.md: the server recalculates everything from the database. The client's
 * number is a REQUEST, not a fact — if it's below the real minimum, we reject it here
 * rather than trusting it.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { companyId, desiredTotalBidCents } = body as Record<string, unknown>;
  if (typeof companyId !== "string") {
    return NextResponse.json({ error: "`companyId` is required" }, { status: 400 });
  }
  if (typeof desiredTotalBidCents !== "number" || !Number.isFinite(desiredTotalBidCents)) {
    return NextResponse.json({ error: "`desiredTotalBidCents` must be a number (cents)" }, { status: 400 });
  }

  const { rows } = await sql<CompanyRow>`select * from companies where id = ${companyId}`;
  const company = rows[0];
  if (!company) {
    return NextResponse.json({ error: "Unknown company" }, { status: 404 });
  }

  const currentBidCents = centsToNumber(company.current_bid_cents);
  const requiredMinimumTotalCents = currentBidCents + computeRequiredAmountCents(currentBidCents);

  if (desiredTotalBidCents < requiredMinimumTotalCents) {
    return NextResponse.json(
      {
        error: "Bid too low",
        requiredMinimumTotalCents,
        currentBidCents,
      },
      { status: 409 }
    );
  }

  const amountToChargeCents = desiredTotalBidCents - currentBidCents;
  const origin = request.headers.get("origin") ?? process.env.PUBLIC_SITE_URL ?? "";

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountToChargeCents,
          product_data: {
            name: `Paid Ranking Position — ${company.name}`,
            description:
              "Promotional placement on the BrokerRace leaderboard. Not an investment, trading, or brokerage product.",
          },
        },
      },
    ],
    success_url: `${origin}/outbid/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/outbid/cancelled`,
    metadata: {
      company_id: company.id,
      previous_bid_cents: String(currentBidCents),
      new_total_bid_cents: String(desiredTotalBidCents),
      amount_cents: String(amountToChargeCents),
    },
  });

  // Record the attempt as PENDING immediately — it only becomes PAID once the webhook
  // confirms it. The /outbid/success redirect must never flip this to PAID itself.
  await sql`
    insert into bids (
      company_id, amount_cents, previous_bid_cents, new_total_bid_cents,
      status, stripe_checkout_session_id
    ) values (
      ${company.id}, ${amountToChargeCents}, ${currentBidCents}, ${desiredTotalBidCents},
      'PENDING', ${session.id}
    )
  `;

  return NextResponse.json({ url: session.url });
}
