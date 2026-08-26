import { readFileSync } from "fs";
import path from "path";

/**
 * GET /  ->  serves the actual BrokerRace site (the Standalone HTML export from Claude
 * Design), instead of a React page. This is a plain Route Handler, not app/page.tsx, on
 * purpose: the exported file is a *complete* HTML document (its own <!DOCTYPE>, <html>,
 * <head>, <body> — plus inlined fonts/scripts as blob-reconstructed resources). Returning
 * it as a raw Response means it is served byte-for-byte, with no interference from
 * app/layout.tsx's own <html>/<body> wrapper (Route Handlers are never wrapped by layouts).
 *
 * The file lives in /public so it deploys as a static asset; we just read it back off disk
 * at request time. To update the site, re-export "Standalone HTML" from Claude Design and
 * replace public/brokerrace-site.html — no code change needed here.
 */
const SITE_HTML_PATH = path.join(process.cwd(), "public", "brokerrace-site.html");

export function GET() {
  const html = readFileSync(SITE_HTML_PATH, "utf-8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // The exported file is a static build of a specific design version — fine to cache
      // briefly at the edge, but never so long that a re-export takes ages to show up.
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
