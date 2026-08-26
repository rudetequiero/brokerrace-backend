import { put } from "@vercel/blob";
import { corsJson, corsPreflight } from "@/lib/cors";

/**
 * POST /api/upload-logo
 * Body: the raw image file bytes, Content-Type set to the file's mime type.
 *
 * Used by the "List Your Company" form: if the company uploads a logo, the frontend
 * sends the file here FIRST, gets back a public URL, then includes that URL as
 * `logoUrl` in the POST /api/companies call. Storage is Vercel Blob — requires the
 * project to have a Blob store connected (Vercel dashboard -> Storage -> Create ->
 * Blob), which auto-injects BLOB_READ_WRITE_TOKEN the same way the Postgres
 * integration injected DATABASE_URL.
 *
 * No auth/rate-limiting here yet (matches the rest of this pass — see the antifraude
 * checklist in the launch playbook for what's still missing before this is fully
 * abuse-resistant).
 */
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) {
    return corsJson(
      { error: "Unsupported image type. Use PNG, JPG, WEBP, GIF, or SVG." },
      { status: 400 }
    );
  }

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength === 0) {
    return corsJson({ error: "Empty file" }, { status: 400 });
  }
  if (buffer.byteLength > MAX_BYTES) {
    return corsJson({ error: "Image is too large (max 5MB)" }, { status: 400 });
  }

  try {
    const filename = `logos/${crypto.randomUUID()}.${ext}`;
    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return corsJson({ url: blob.url }, { status: 201 });
  } catch (err) {
    console.error("POST /api/upload-logo failed", err);
    return corsJson(
      { error: "Upload failed. Make sure Blob storage is connected to this project." },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return corsPreflight();
}
