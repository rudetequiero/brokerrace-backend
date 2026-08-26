import { NextResponse } from "next/server";
import { sql, centsToNumber } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { recordActivity } from "@/lib/market";
import type Stripe from "stripe";

// Stripe needs the raw request body to verify the signature — Next.js must not
// parse/transform it first.
export const runtime = "nodejs";

function fmtMoney(cents: number): string {
  return "$" + Math.round(cents / 100).toLocaleString("en-US");
}

/**
 * POST /api/stripe/webhook
 *
 * This is the ONLY place a bid is ever marked PAID. Per PAYMENTS.md:
 * "the /payment-success redirect must not activate a bid" — the frontend's success
 * page should just say "processing, refresh in a moment", never write to the DB itself.
 *
 * Point Stripe at:  https://<your-domain>/api/stripe/webhook
 * Events to enable: checkout.session.completed, checkout.session.expired,
 *                    charge.refunded, charge.dispute.created
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // --- Idempotency: if we've already processed this exact event, stop here. ---
  // Stripe redelivers events on timeout/error, so this MUST run before any side effects.
  try {
    await sql`
      insert into processed_stripe_events (event_id, event_type)
      values (${event.id}, ${event.type})
    `;
  } catch (err: any) {
    if (err?.code === "23505") {
      // unique_violation -> already processed this event id, ignore the retry.
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw err;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handlePaidSession(session);
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await sql`
        update bids set status = 'CANCELLED'
        where stripe_checkout_session_id = ${session.id} and status = 'PENDING'
      `;
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      if (typeof charge.payment_intent === "string") {
        // Note: we intentionally do NOT reverse companies.current_bid_cents here.
        // Decide your refund policy (does a refunded bid lose its rank retroactively?)
        // before wiring that up — for now this only marks the ledger row, so nothing
        // is silently lost from the audit trail.
        await sql`
          update bids set status = 'REFUNDED'
          where stripe_payment_intent_id = ${charge.payment_intent}
        `;
      }
      break;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      if (typeof dispute.payment_intent === "string") {
        await sql`
          update bids set status = 'DISPUTED'
          where stripe_payment_intent_id = ${dispute.payment_intent}
        `;
      }
      break;
    }
    default:
      // Unhandled event types are fine to ignore — Stripe sends many we don't act on.
      break;
  }

  return NextResponse.json({ received: true });
}

async function handlePaidSession(session: Stripe.Checkout.Session) {
  const { rows } = await sql<{
    id: string;
    company_id: string;
    amount_cents: string;
    new_total_bid_cents: string;
    status: string;
  }>`
    select id, company_id, amount_cents, new_total_bid_cents, status
    from bids
    where stripe_checkout_session_id = ${session.id}
  `;
  const bid = rows[0];
  if (!bid) {
    console.error("Webhook: no matching bid for session", session.id);
    return;
  }
  if (bid.status === "PAID") {
    return; // already handled (defensive — processed_stripe_events should already prevent this)
  }

  const amountCents = centsToNumber(bid.amount_cents);
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  await sql`
    update bids
    set status = 'PAID', paid_at = now(), stripe_payment_intent_id = ${paymentIntentId}
    where id = ${bid.id}
  `;

  // Additive update, not "set to new_total_bid_cents": if two bids for the SAME company
  // are confirmed close together, addition is always correct regardless of order. Setting
  // to the pre-computed target would risk clobbering a second concurrent payment — this is
  // the "race-condition handling" PAYMENTS.md calls out; the fuller version (reject/reprice
  // when someone else has since taken the target rank) is a deliberate v2, not built here.
  const { rows: updated } = await sql<{ current_bid_cents: string; name: string }>`
    update companies
    set current_bid_cents = current_bid_cents + ${amountCents}, updated_at = now()
    where id = ${bid.company_id}
    returning current_bid_cents, name
  `;
  const company = updated[0];
  const wasNewEntry = centsToNumber(bid.new_total_bid_cents) - amountCents === 0;

  await recordActivity(
    wasNewEntry
      ? `${company.name} entered the leaderboard at ${fmtMoney(amountCents)}`
      : `${company.name} raised its bid by ${fmtMoney(amountCents)} — now at ${fmtMoney(
          centsToNumber(company.current_bid_cents)
        )}`,
    bid.company_id
  );
}
