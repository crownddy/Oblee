import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCAL_SITE_URL, isLocalOrigin, resolveSiteUrl } from "@/lib/site-url";
import { buildSitemapEntries } from "@/lib/seo";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const PRODUCTION = "https://oblee-liart.vercel.app";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("resolveSiteUrl", () => {
  it("uses the configured public URL when it is set", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://oblee.com" })).toBe("https://oblee.com");
  });

  it("strips a trailing slash and adds a missing scheme", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://oblee.com/" })).toBe("https://oblee.com");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "oblee.com" })).toBe("https://oblee.com");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "  https://oblee.com//  " })).toBe("https://oblee.com");
  });

  it("falls back to the Vercel production domain when no public URL is set", () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "oblee-liart.vercel.app" })).toBe(PRODUCTION);
  });

  it("refuses to publish a localhost public URL while a Vercel host exists", () => {
    // The reported production bug: a developer's .env.local value shipped to Vercel.
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        VERCEL_PROJECT_PRODUCTION_URL: "oblee-liart.vercel.app",
      }),
    ).toBe(PRODUCTION);
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000/", VERCEL_URL: "oblee-abc123.vercel.app" }),
    ).toBe("https://oblee-abc123.vercel.app");
  });

  it("keeps a preview deployment on its own host instead of localhost", () => {
    expect(resolveSiteUrl({ VERCEL_URL: "oblee-git-fix-abc.vercel.app" })).toBe(
      "https://oblee-git-fix-abc.vercel.app",
    );
  });

  it("still uses localhost for local development", () => {
    expect(resolveSiteUrl({})).toBe(LOCAL_SITE_URL);
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" })).toBe(LOCAL_SITE_URL);
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "" })).toBe(LOCAL_SITE_URL);
  });

  it("recognises every loopback form", () => {
    for (const origin of ["http://localhost:3000", "https://localhost", "http://127.0.0.1:8080", "http://[::1]:3000"]) {
      expect(isLocalOrigin(origin)).toBe(true);
    }
    for (const origin of [PRODUCTION, "https://oblee.com", "https://localhost.example.com"]) {
      expect(isLocalOrigin(origin)).toBe(false);
    }
  });
});

describe("production sitemap", () => {
  const events = [
    { id: "6ce672c8-eb70-4994-ad5c-820d00000001", updatedAt: "2026-11-20T10:00:00.000Z" },
    { id: "6ce672c8-eb70-4994-ad5c-820d00000002", updatedAt: null },
  ];

  it("builds every URL on the production origin", () => {
    const entries = buildSitemapEntries(
      resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "oblee-liart.vercel.app" }),
      events,
    );

    expect(entries.length).toBeGreaterThan(events.length);
    for (const entry of entries) {
      expect(entry.url.startsWith(PRODUCTION)).toBe(true);
      expect(entry.url).not.toMatch(/localhost|127\.0\.0\.1/);
    }
    expect(entries.map((entry) => entry.url)).toContain(`${PRODUCTION}/events/${events[0]?.id}`);
  });

  it("serialises to XML without a single localhost URL when deployed", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "oblee-liart.vercel.app");
    vi.resetModules();

    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries.map((entry) => `<url><loc>${entry.url}</loc></url>`),
      "</urlset>",
    ].join("");

    expect(xml).toContain(`<loc>${PRODUCTION}/</loc>`);
    expect(xml).toContain(`<loc>${PRODUCTION}/explore</loc>`);
    expect(xml).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  it("declares the production host and sitemap in robots.txt when deployed", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "oblee-liart.vercel.app");
    vi.resetModules();

    const { default: robots } = await import("@/app/robots");
    const rules = robots();

    expect(rules.host).toBe(PRODUCTION);
    expect(rules.sitemap).toBe(`${PRODUCTION}/sitemap.xml`);
    expect(JSON.stringify(rules)).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  it("keeps localhost for a developer running the app locally", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    vi.resetModules();

    const { default: robots } = await import("@/app/robots");
    expect(robots().host).toBe(LOCAL_SITE_URL);
  });
});

describe("site origin wiring", () => {
  it("keeps the origin out of the client bundle", () => {
    // VERCEL_* variables are server-only; importing this module from a client
    // component would ship `undefined` values to the browser.
    const config = read("src/lib/supabase/config.ts");
    expect(config).not.toMatch(/export const siteUrl/);
    expect(config).not.toMatch(/VERCEL_/);
  });

  it("routes every origin consumer through the server-only module", () => {
    for (const file of [
      "src/app/layout.tsx",
      "src/app/robots.ts",
      "src/app/sitemap.ts",
      "src/app/events/[id]/page.tsx",
      "src/lib/utils/request.ts",
    ]) {
      const source = read(file);
      expect(source).toContain('from "@/lib/site-url"');
      expect(source).not.toContain("supabase/config");
    }
  });

  it("never hardcodes a localhost fallback outside the resolver", () => {
    for (const file of ["src/app/sitemap.ts", "src/app/robots.ts", "src/lib/seo.ts"]) {
      expect(read(file)).not.toMatch(/localhost/);
    }
  });
});
