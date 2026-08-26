// Thin wrapper around the Neon serverless driver, shaped to look like @vercel/postgres's
// old `sql` tagged-template helper (which is deprecated — Vercel migrated its own Postgres
// product to Neon, see README.md) so the rest of the codebase can just do:
//
//   const { rows } = await sql`select * from companies`;
//
// regardless of which Postgres provider is actually behind DATABASE_URL. This works with
// Neon, Supabase, or any standard Postgres connection string — @neondatabase/serverless is
// an HTTP-based driver, not Neon-account-specific, so it's a safe default even if you end
// up hosting the database somewhere other than Neon.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type SqlFn = <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<{ rows: T[]; rowCount: number | null }>;

// Lazily constructed for the same reason as lib/stripe.ts's getStripe(): reading
// DATABASE_URL at module-import time would make Next.js's build-time "collect page data"
// step throw for every route that imports this file, before any request has been made.
let _client: NeonQueryFunction<false, true> | null = null;

function client(): NeonQueryFunction<false, true> {
  if (_client) return _client;

  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. If you used the Neon Vercel integration this is injected " +
        "automatically; for local dev, copy .env.example to .env.local and fill it in."
    );
  }

  // fullResults:true makes the return shape { rows, rowCount, fields, ... } instead of a
  // bare array, matching what the rest of this codebase expects.
  _client = neon(connectionString, { fullResults: true });
  return _client;
}

function run(strings: TemplateStringsArray, ...values: unknown[]) {
  return client()(strings, ...values);
}

export const sql = run as unknown as SqlFn;

/** Convert a bigint-as-string column (Postgres bigint -> driver string) into a number. */
export function centsToNumber(value: string | number): number {
  return typeof value === "number" ? value : parseInt(value, 10);
}
