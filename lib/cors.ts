import { NextResponse } from "next/server";

/**
 * The Claude Design canvas (where Outbid Platform.dc.html actually runs) lives on a
 * different origin than this API (brokerrace-backend.vercel.app), so every response has
 * to carry CORS headers or the browser blocks the fetch() before our code ever runs.
 *
 * "*" is intentionally permissive: this API has no cookies/session auth (Stripe payment
 * confirmation happens server-side via the webhook, never via a browser credential), so
 * there's nothing sensitive a third-party origin could steal by reading these responses.
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Same as NextResponse.json(...), but with CORS headers merged in. */
export function corsJson(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init?.headers as Record<string, string> | undefined) },
  });
}

/** For routes that return 204 No Content (e.g. /api/click). */
export function corsNoContent(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Shared OPTIONS handler for the browser's CORS preflight request. */
export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
