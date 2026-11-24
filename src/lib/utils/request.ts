import { headers } from "next/headers";
import { siteUrl } from "@/lib/supabase/config";

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

export function safeNextPath(value: FormDataEntryValue | string | null | undefined, fallback = "/profile"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
