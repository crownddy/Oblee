/**
 * Public origin used by canonical links, Open Graph, robots.txt, the sitemap and
 * structured data. Server-only: it reads deployment environment variables that
 * must not reach the browser, so do not import it from a client component.
 */

export const LOCAL_SITE_URL = "http://localhost:3000";

type Env = Record<string, string | undefined>;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/\/+$/, "");
  return trimmed ? trimmed : undefined;
}

function withScheme(host: string): string {
  return /^https?:\/\//i.test(host) ? host : `https://${host}`;
}

/** Loopback origins are only ever right on a developer machine. */
export function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/i.test(origin);
}

/**
 * Resolution order:
 *   1. `NEXT_PUBLIC_SITE_URL` — the operator's explicit choice.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` — the project's production domain, which
 *      Vercel exposes to every deployment, build step included.
 *   3. `VERCEL_URL` — the deployment's own host, so previews never fall back to
 *      localhost.
 *   4. `http://localhost:3000` — local development.
 *
 * A localhost value is ignored while a Vercel host is available: a deployment
 * whose `NEXT_PUBLIC_SITE_URL` was copied from `.env.local` must not publish
 * canonicals, a sitemap or a robots host pointing at the developer's machine.
 */
export function resolveSiteUrl(env: Env = process.env): string {
  const explicit = clean(env.NEXT_PUBLIC_SITE_URL);
  const vercelHost = clean(env.VERCEL_PROJECT_PRODUCTION_URL) ?? clean(env.VERCEL_URL);
  const vercelOrigin = vercelHost ? withScheme(vercelHost) : undefined;

  if (explicit && !(vercelOrigin && isLocalOrigin(withScheme(explicit)))) {
    return withScheme(explicit);
  }
  if (vercelOrigin) return vercelOrigin;
  return LOCAL_SITE_URL;
}

export const siteUrl = resolveSiteUrl();
