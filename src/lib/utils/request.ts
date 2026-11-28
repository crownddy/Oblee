import { headers } from "next/headers";
import { siteUrl } from "@/lib/site-url";

/** Public origin of the current request, used for auth email redirects. */
export async function getOrigin(): Promise<string> {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return siteUrl;
}

const SAME_SITE_BASE = "https://oblee.invalid";

/**
 * Keeps `next` on this site. `//host`, `/\host` and names containing a control
 * character all resolve to another origin, so the value is resolved against a
 * throwaway base and only the path, query and hash are handed back.
 */
export function safeNextPath(
  value: FormDataEntryValue | string | null | undefined,
  fallback = "/profile",
): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;

  let resolved: URL;
  try {
    resolved = new URL(value, SAME_SITE_BASE);
  } catch {
    return fallback;
  }
  if (resolved.origin !== SAME_SITE_BASE) return fallback;
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
