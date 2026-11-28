import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, afterEach, vi } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  DEFAULT_DESCRIPTION,
  MAX_SITEMAP_EVENTS,
  STATIC_PAGES,
  absoluteUrl,
  buildSitemapEntries,
  canonicalPath,
  discoveryRobots,
  eventDescription,
  eventJsonLd,
  eventMetadata,
  isEventId,
  isFilteredView,
  isIndexableEvent,
  organisationJsonLd,
  searchConsoleVerification,
  serializeJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { getEventForViewer, listSitemapEvents } from "@/lib/services/events";
import { siteUrl } from "@/lib/site-url";
import type { EventDetail } from "@/lib/types/domain";

const SITE = "https://oblee.example";

function event(overrides: Partial<EventDetail> = {}): EventDetail {
  return {
    id: "5f0f0f0f-0000-4000-8000-000000000001",
    title: "Detty Rave",
    category: "music",
    venue: "Eko Hotel",
    city: "Lagos",
    startsAt: "2026-12-28T20:00:00.000Z",
    timezone: "Africa/Lagos",
    isFree: false,
    heroImageUrl: null,
    colorFrom: "#6a47f5",
    colorTo: "#c026d3",
    status: "published",
    visibility: "public",
    organiserId: "organiser-1",
    organiserName: "Oblee Events",
    tags: ["rave"],
    priceFrom: 15000,
    priceTierCount: 2,
    isSaved: false,
    heroImagePath: null,
    description: "Afrobeats until sunrise on the Lagos waterfront.",
    securityNote: "On-site security",
    identityNote: "ID required",
    publishedAt: "2026-11-01T10:00:00.000Z",
    archivedAt: null,
    tickets: [
      { name: "Regular", price: 15000 },
      { name: "VIP", price: 45000 },
    ],
    tables: [],
    contacts: [],
    organiserAvatarUrl: null,
    isFeatured: true,
    isOwner: false,
    isAdminViewer: false,
    canReport: true,
    isReportedByViewer: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("canonical URLs", () => {
  it("keeps the discovery parameters that identify a view", () => {
    expect(canonicalPath("/explore", { q: "rave", cat: "music", date: "2026-12-28", page: "2" })).toBe(
      "/explore?q=rave&cat=music&date=2026-12-28&page=2",
    );
  });

  it("drops tracking parameters so shared links do not index separately", () => {
    expect(
      canonicalPath("/explore", { q: "rave", utm_source: "whatsapp", utm_campaign: "detty", fbclid: "abc", gclid: "x" }),
    ).toBe("/explore?q=rave");
  });

  it("treats page 1 as the bare route", () => {
    expect(canonicalPath("/", { page: "1" })).toBe("/");
    expect(canonicalPath("/", { page: "nope" })).toBe("/");
  });

  it("normalises trailing slashes and stray query strings", () => {
    expect(canonicalPath("/explore/", {})).toBe("/explore");
    expect(canonicalPath("/explore?utm_source=x", {})).toBe("/explore");
    expect(canonicalPath("", {})).toBe("/");
  });

  it("keeps the home canonical bare for an unfiltered visit", () => {
    expect(canonicalPath("/", { utm_medium: "email" })).toBe("/");
  });

  it("recognises filtered views", () => {
    expect(isFilteredView({ q: "rave" })).toBe(true);
    expect(isFilteredView({ cat: "music" })).toBe(true);
    expect(isFilteredView({ date: "2026-12-28" })).toBe(true);
    expect(isFilteredView({ utm_source: "x" })).toBe(false);
    expect(isFilteredView({})).toBe(false);
  });
});

describe("indexing rules for discovery", () => {
  it("indexes the bare home page", () => {
    expect(discoveryRobots("home", {})).toEqual({ index: true, follow: true });
  });

  it("keeps filtered home views out of the index instead of canonicalising them to /", () => {
    expect(discoveryRobots("home", { q: "rave" })).toEqual({ index: false, follow: true });
  });

  it("lets filtered explore views keep their own canonical and stay indexable", () => {
    expect(discoveryRobots("explore", { q: "rave" })).toEqual({ index: true, follow: true });
  });
});

describe("event metadata", () => {
  it("uses the event's own title, description and canonical", () => {
    const metadata = eventMetadata(event());
    expect(metadata.title).toBe("Detty Rave");
    expect(metadata.description).toBe("Afrobeats until sunrise on the Lagos waterfront.");
    expect(metadata.alternates?.canonical).toBe("/events/5f0f0f0f-0000-4000-8000-000000000001");
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph?.title).toBe("Detty Rave");
  });

  it("falls back to stored fields when the description is empty", () => {
    const description = eventDescription(event({ description: "" }));
    expect(description).toContain("Detty Rave");
    expect(description).toContain("Eko Hotel, Lagos");
    expect(description).not.toContain("undefined");
  });

  it("never advertises a private event", () => {
    const metadata = eventMetadata(event({ visibility: "private" }));
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });

  it("never advertises an archived event", () => {
    const metadata = eventMetadata(event({ status: "archived", archivedAt: "2026-11-20T00:00:00.000Z" }));
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });

  it("only treats published public events as indexable", () => {
    expect(isIndexableEvent(event())).toBe(true);
    expect(isIndexableEvent(event({ visibility: "private" }))).toBe(false);
    expect(isIndexableEvent(event({ status: "archived" }))).toBe(false);
    expect(isIndexableEvent(event({ status: "removed" }))).toBe(false);
  });
});

describe("structured data", () => {
  it("describes a public published event from its own row", () => {
    const data = eventJsonLd(event(), SITE) as Record<string, unknown>;
    expect(data["@type"]).toBe("Event");
    expect(data.name).toBe("Detty Rave");
    expect(data.startDate).toBe("2026-12-28T20:00:00.000Z");
    expect(data.url).toBe(`${SITE}/events/5f0f0f0f-0000-4000-8000-000000000001`);
    expect(data.location).toEqual({
      "@type": "Place",
      name: "Eko Hotel",
      address: { "@type": "PostalAddress", addressLocality: "Lagos" },
    });
    expect(data.organizer).toEqual({ "@type": "Organization", name: "Oblee Events" });
    expect(data.offers).toEqual({
      "@type": "Offer",
      price: 15000,
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
      url: `${SITE}/events/5f0f0f0f-0000-4000-8000-000000000001`,
    });
  });

  it("marks free events as free and priced at zero", () => {
    const data = eventJsonLd(event({ isFree: true, priceFrom: null, priceTierCount: 0 }), SITE) as Record<string, unknown>;
    expect(data.isAccessibleForFree).toBe(true);
    expect((data.offers as { price: number }).price).toBe(0);
  });

  it("omits a price the event does not have", () => {
    const data = eventJsonLd(event({ isFree: false, priceFrom: null, priceTierCount: 0, tickets: [] }), SITE) as Record<string, unknown>;
    expect(data.offers).toBeUndefined();
  });

  it("omits organiser details the record does not hold", () => {
    const data = eventJsonLd(event({ organiserName: null }), SITE) as Record<string, unknown>;
    expect(data.organizer).toBeUndefined();
  });

  it("omits an empty description rather than filling it in", () => {
    const data = eventJsonLd(event({ description: "   " }), SITE) as Record<string, unknown>;
    expect(data.description).toBeUndefined();
  });

  it("emits nothing for private, archived and removed events", () => {
    expect(eventJsonLd(event({ visibility: "private" }), SITE)).toBeNull();
    expect(eventJsonLd(event({ status: "archived" }), SITE)).toBeNull();
    expect(eventJsonLd(event({ status: "removed" }), SITE)).toBeNull();
  });

  it("cannot break out of the script element", () => {
    const payload = serializeJsonLd(eventJsonLd(event({ title: "</script><img src=x onerror=alert(1)>" }), SITE));
    expect(payload).not.toContain("</script>");
    expect(payload).not.toContain("<img");
    expect(JSON.parse(payload).name).toContain("</script>");
  });

  it("describes the site and the organisation without inventing facts", () => {
    const site = websiteJsonLd(SITE) as Record<string, unknown>;
    expect(site["@type"]).toBe("WebSite");
    expect(site.url).toBe(`${SITE}/`);
    expect(site.description).toBe(DEFAULT_DESCRIPTION);

    const organisation = organisationJsonLd(SITE) as Record<string, unknown>;
    expect(organisation["@type"]).toBe("Organization");
    expect(organisation.logo).toBe(`${SITE}/brand/mark.png`);
    expect(organisation).not.toHaveProperty("address");
    expect(organisation).not.toHaveProperty("telephone");
  });
});

describe("sitemap", () => {
  it("lists the public pages and public events", () => {
    const entries = buildSitemapEntries(SITE, [
      { id: "5f0f0f0f-0000-4000-8000-000000000001", updatedAt: "2026-11-20T09:00:00.000Z" },
    ]);
    const urls = entries.map((entry) => entry.url);
    expect(urls).toEqual([
      `${SITE}/`,
      `${SITE}/explore`,
      `${SITE}/privacy`,
      `${SITE}/terms`,
      `${SITE}/events/5f0f0f0f-0000-4000-8000-000000000001`,
    ]);
  });

  it("uses the row's own timestamp as lastmod", () => {
    const entries = buildSitemapEntries(SITE, [
      { id: "5f0f0f0f-0000-4000-8000-000000000002", updatedAt: "2026-11-20T09:00:00.000Z" },
    ]);
    const eventEntry = entries.at(-1);
    expect(eventEntry?.lastModified).toEqual(new Date("2026-11-20T09:00:00.000Z"));
  });

  it("omits lastmod instead of inventing a date", () => {
    const entries = buildSitemapEntries(SITE, [{ id: "5f0f0f0f-0000-4000-8000-000000000003", updatedAt: null }]);
    expect(entries.at(-1)).toEqual({
      url: `${SITE}/events/5f0f0f0f-0000-4000-8000-000000000003`,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  it("skips ids that cannot be event ids", () => {
    const entries = buildSitemapEntries(SITE, [
      { id: "not-an-id", updatedAt: null },
      { id: "", updatedAt: null },
    ]);
    expect(entries).toHaveLength(STATIC_PAGES.length);
  });

  it("never repeats a URL", () => {
    const id = "5f0f0f0f-0000-4000-8000-000000000004";
    const entries = buildSitemapEntries(SITE, [
      { id, updatedAt: null },
      { id, updatedAt: null },
    ], ["/", "/", "/explore"]);
    expect(entries.filter((entry) => entry.url === `${SITE}/events/${id}`)).toHaveLength(1);
    expect(entries.filter((entry) => entry.url === `${SITE}/`)).toHaveLength(1);
  });

  it("caps the dynamic list", () => {
    const many = Array.from({ length: MAX_SITEMAP_EVENTS + 5 }, (_, index) => ({
      id: `5f0f0f0f-0000-4000-8000-${String(index).padStart(12, "0")}`,
      updatedAt: null,
    }));
    expect(buildSitemapEntries(SITE, many)).toHaveLength(STATIC_PAGES.length + MAX_SITEMAP_EVENTS);
  });

  it("serves the static pages when the database is unavailable", async () => {
    // Demo mode has no database: an empty event list is the safe answer, and no
    // sample content is fabricated into the file.
    await expect(listSitemapEvents()).resolves.toEqual([]);
    const entries = await sitemap();
    expect(entries.map((entry) => entry.url)).toEqual(STATIC_PAGES.map((page) => absoluteUrl(siteUrl, page)));
  });

  it("filters eligibility in the query, before the limit", () => {
    const source = readFileSync(path.join(process.cwd(), "src/lib/services/events.ts"), "utf8");
    const start = source.indexOf("export async function listSitemapEvents");
    const body = source.slice(start, source.indexOf("\n}", start));
    expect(start).toBeGreaterThan(-1);
    expect(body).toContain('.eq("status", "published")');
    expect(body).toContain('.eq("visibility", "public")');
    expect(body.indexOf('.eq("status", "published")')).toBeLessThan(body.indexOf(".limit(limit)"));
    expect(body.indexOf('.eq("visibility", "public")')).toBeLessThan(body.indexOf(".limit(limit)"));
  });
});

describe("robots.txt", () => {
  const rules = robots();

  it("lets crawlers reach the public pages", () => {
    const rule = Array.isArray(rules.rules) ? rules.rules[0] : rules.rules;
    expect(rule?.allow).toBe("/");
    expect(rule?.disallow).not.toContain("/");
    expect(rule?.userAgent).toBe("*");
  });

  it("blocks the signed-in areas", () => {
    const rule = Array.isArray(rules.rules) ? rules.rules[0] : rules.rules;
    const disallow = ([] as string[]).concat(rule?.disallow ?? []);
    for (const privatePath of ["/admin", "/admin/", "/settings", "/saved", "/profile", "/auth/", "/events/*/edit"]) {
      expect(disallow).toContain(privatePath);
    }
  });

  it("declares the sitemap on the configured domain", () => {
    expect(rules.sitemap).toBe(`${siteUrl}/sitemap.xml`);
    expect(rules.host).toBe(siteUrl);
  });
});

describe("Search Console verification", () => {
  it("emits nothing when no token is configured", () => {
    expect(searchConsoleVerification(undefined)).toBeUndefined();
    expect(searchConsoleVerification("   ")).toBeUndefined();
  });

  it("passes the configured token through", () => {
    expect(searchConsoleVerification("abc123")).toEqual({ google: "abc123" });
  });

  it("reads GOOGLE_SITE_VERIFICATION from the environment", () => {
    vi.stubEnv("GOOGLE_SITE_VERIFICATION", "env-token");
    expect(searchConsoleVerification()).toEqual({ google: "env-token" });
  });
});

describe("event ids", () => {
  it("accepts a uuid", () => {
    expect(isEventId("5f0f0f0f-0000-4000-8000-000000000001")).toBe(true);
  });

  it("rejects anything that cannot be an event id", () => {
    for (const value of ["not-a-uuid", "", "5f0f0f0f", null, undefined, "/etc/passwd"]) {
      expect(isEventId(value as string)).toBe(false);
    }
  });

  it("answers a malformed id with no event instead of a query", async () => {
    await expect(getEventForViewer("not-a-uuid")).resolves.toBeNull();
  });
});
