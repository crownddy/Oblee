/**
 * Supabase configuration. Public keys only — the service role key is never
 * required by Oblee and must not be exposed to the browser.
 */

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

function looksReal(value: string, minimumLength: number): boolean {
  return value.length >= minimumLength && !value.includes("YOUR-") && !value.includes("YOUR_");
}

export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = anonKey;

export const isSupabaseConfigured =
  looksReal(url, 20) && url.startsWith("https://") && looksReal(anonKey, 40);

export const REQUIRED_ENV_VARS = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    description: "Supabase project URL (Project Settings → API → Project URL).",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    description: "Supabase anon/public key (Project Settings → API → Project API keys).",
  },
  {
    name: "NEXT_PUBLIC_SITE_URL",
    description:
      "Public origin for canonicals, the sitemap, robots.txt and auth emails. Optional on Vercel: it falls back to the project's production domain.",
  },
] as const;

export function requireSupabaseConfig(): { url: string; anonKey: string } {
  if (!isSupabaseConfigured) {
    throw new SupabaseNotConfiguredError();
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

export const CONFIG_REQUIRED_MESSAGE =
  "This action needs Supabase. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app.";
