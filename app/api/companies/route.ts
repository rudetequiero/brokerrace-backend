import { sql } from "@/lib/db";
import { corsJson, corsPreflight } from "@/lib/cors";

/**
 * POST /api/companies
 * Creates a new (unverified, $0-bid) company listing — the "List Your Company" step
 * from the brief's "How Outbid Works". This does NOT collect payment; it just creates
 * the row that a subsequent /api/checkout call will attach a bid to.
 *
 * Verification (Identity Verified / Verified Broker / License Verified, etc. — see the
 * legal pack's verification tiers) is a manual review step, intentionally NOT automated
 * here. In practice this means: new rows land as verification_level='UNVERIFIED', and an
 * admin (you, for now — there is no admin UI in this pass) updates that column by hand
 * once the company has sent the required documents.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return corsJson({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, category, categoryLabel, country, website } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length < 2) {
    return corsJson({ error: "`name` is required" }, { status: 400 });
  }
  const ALLOWED_CATEGORIES = ["CRYPTO", "FOREX", "STOCKS", "CFD", "PROP", "FINTECH"];
  if (typeof category !== "string" || !ALLOWED_CATEGORIES.includes(category)) {
    return corsJson(
      { error: `\`category\` must be one of: ${ALLOWED_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }

  const slug = slugify(name);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 3)
    .join("")
    .toUpperCase();

  try {
    const { rows } = await sql`
      insert into companies (slug, name, category, category_label, country, website, initials)
      values (
        ${slug},
        ${name.trim()},
        ${category},
        ${typeof categoryLabel === "string" ? categoryLabel : category},
        ${typeof country === "string" ? country : null},
        ${typeof website === "string" ? website : null},
        ${initials}
      )
      returning id, slug
    `;
    return corsJson({ company: rows[0] }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") {
      // unique_violation on slug
      return corsJson(
        { error: "A company with a very similar name is already listed. Try a more specific name." },
        { status: 409 }
      );
    }
    console.error("POST /api/companies failed", err);
    return corsJson({ error: "Could not create listing" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return corsPreflight();
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "company"
  );
}
