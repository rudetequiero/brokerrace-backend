import Stripe from "stripe";

// Lazily constructed: reading STRIPE_SECRET_KEY at module-import time would make Next.js's
// build-time "collect page data" step throw for every route that imports this file, even
// though no request has actually been made yet. Constructing on first real use means a
// missing key only breaks the specific request that needed Stripe — and still fails loudly,
// just at the right moment.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it in your Vercel project's Environment Variables " +
        "(Settings -> Environment Variables) or in .env.local for local dev."
    );
  }

  _stripe = new Stripe(secretKey, {
    apiVersion: "2026-07-29.dahlia",
  });
  return _stripe;
}
