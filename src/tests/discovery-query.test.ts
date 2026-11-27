import { describe, expect, it } from "vitest";
import { categoryLabel } from "@/lib/constants";
import { demoEvents } from "@/lib/demo/events";
import {
  MAX_QUERY_LENGTH,
  SEARCH_TEXT_FIELDS,
  buildDiscoveryQuery,
  categoriesMatching,
  normaliseCategoryParam,
  normaliseDateParam,
  normaliseSearchTerms,
  orFiltersForTerm,
  pageWindow,
  resolvePage,
} from "@/lib/utils/discovery";
import { filterEvents, matchesQuery, searchTerms } from "@/lib/utils/events";
import { dayRange, weekendRange } from "@/lib/utils/ranges";
import { dateKey } from "@/lib/utils/format";
import type { EventSummary } from "@/lib/types/domain";

const NOW = new Date("2026-11-24T12:00:00Z");
const LAGOS = "Africa/Lagos";

function summary(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id: "id",
    title: "Detty Rave",
    category: "music",
    venue: "Lekki",
    city: "Lagos",
    startsAt: "2026-11-24T18:00:00.000Z",
    timezone: LAGOS,
    isFree: true,
    heroImageUrl: null,
    colorFrom: "#6a47f5",
    colorTo: "#c026d3",
    status: "published",
    visibility: "public",
    organiserId: "organiser-1",
    organiserName: "Oblee Studio",
    tags: ["afrobeats"],
    isSaved: false,
    ...overrides,
  };
}

/** What the demo path keeps, expressed the way listPublishedEvents filters it. */
function upcoming(events: EventSummary[], upcomingFrom: string | null): EventSummary[] {
  if (!upcomingFrom) return events;
  return events.filter((event) => Date.parse(event.startsAt) >= Date.parse(upcomingFrom));
}

describe("upcoming-only default discovery", () => {
  it("bounds the default query at now and applies no explicit range", () => {
    const query = buildDiscoveryQuery({ now: NOW });

    expect(query.range).toBeNull();
    expect(query.upcomingFrom).toBe(NOW.toISOString());
  });

  it("keeps events later today and drops ones that already started", () => {
    const query = buildDiscoveryQuery({ now: NOW });
    const events = [
      summary({ id: "later", startsAt: "2026-11-24T18:00:00.000Z" }),
      summary({ id: "tonight", startsAt: "2026-11-24T23:30:00.000Z" }),
      summary({ id: "started", startsAt: "2026-11-24T11:00:00.000Z" }),
      summary({ id: "yesterday", startsAt: "2026-11-23T21:00:00.000Z" }),
    ];

    expect(upcoming(events, query.upcomingFrom).map((event) => event.id)).toEqual(["later", "tonight"]);
  });

  it("treats an explicit date as authoritative, including past dates", () => {
    const query = buildDiscoveryQuery({ date: "2020-01-01", now: NOW });

    expect(query.range).toEqual(dayRange("2020-01-01", LAGOS));
    expect(query.upcomingFrom).toBeNull();
  });

  it("keeps the Today and Weekend shortcuts authoritative", () => {
    const today = buildDiscoveryQuery({ category: "Today", now: NOW });
    const weekend = buildDiscoveryQuery({ category: "Weekend", now: NOW });

    expect(today.range).toEqual(dayRange(dateKey(NOW.toISOString(), LAGOS), LAGOS));
    expect(today.upcomingFrom).toBeNull();
    expect(today.category).toBeNull();
    expect(weekend.range).toEqual(weekendRange(NOW, LAGOS));
    expect(weekend.upcomingFrom).toBeNull();
  });

  it("still bounds a category-only query by now", () => {
    const query = buildDiscoveryQuery({ category: "music", now: NOW });

    expect(query.category).toBe("music");
    expect(query.range).toBeNull();
    expect(query.upcomingFrom).toBe(NOW.toISOString());
  });
});

describe("category and date combine", () => {
  it("applies both for ?cat=music&date=2026-11-28", () => {
    const query = buildDiscoveryQuery({ category: "music", date: "2026-11-28", now: NOW });

    expect(query.category).toBe("music");
    expect(query.range).toEqual(dayRange("2026-11-28", LAGOS));
    expect(query.upcomingFrom).toBeNull();
  });

  it("matches the audit example against demo data the way the UI sends it", () => {
    const events = [
      summary({ id: "music-that-day", category: "music", startsAt: "2026-11-28T20:00:00.000Z" }),
      summary({ id: "food-that-day", category: "food", startsAt: "2026-11-28T12:00:00.000Z" }),
      summary({ id: "music-other-day", category: "music", startsAt: "2026-11-29T20:00:00.000Z" }),
    ];

    const query = buildDiscoveryQuery({ category: "music", date: "2026-11-28", now: NOW });
    const sameDay = events.filter(
      (event) =>
        Date.parse(event.startsAt) >= Date.parse(query.range!.start) &&
        Date.parse(event.startsAt) < Date.parse(query.range!.endExclusive),
    );

    expect(sameDay.map((event) => event.id)).toEqual(["music-that-day", "food-that-day"]);
    expect(sameDay.filter((event) => event.category === query.category).map((event) => event.id)).toEqual([
      "music-that-day",
    ]);
  });
});

describe("search fields", () => {
  it("searches the same text columns in both paths", () => {
    expect([...SEARCH_TEXT_FIELDS]).toEqual(["title", "venue", "city", "description"]);

    const filters = orFiltersForTerm("lagos");
    for (const field of SEARCH_TEXT_FIELDS) {
      expect(filters).toContain(`${field}.ilike.%lagos%`);
    }
  });

  it("searches tags, which the production query previously dropped", () => {
    expect(orFiltersForTerm("afrobeats")).toContain("tags.cs.{afrobeats}");
    expect(buildDiscoveryQuery({ query: "afrobeats" }).orGroups.flat()).toContain("tags.cs.{afrobeats}");
  });

  it("searches category labels through the enum values", () => {
    expect(categoriesMatching("fashion")).toEqual(["fashion_show"]);
    expect(orFiltersForTerm("fashion")).toContain("category.in.(fashion_show)");
    expect(categoriesMatching("show")).toEqual(["fashion_show", "trade_show"]);
    expect(orFiltersForTerm("show")).toContain("category.in.(fashion_show,trade_show)");
    expect(categoriesMatching("party")).toEqual(["party"]);
    expect(categoriesMatching("zzz")).toEqual([]);
  });

  it("requires every word to match, one OR group per term", () => {
    const query = buildDiscoveryQuery({ query: "detty lagos" });

    expect(query.terms).toEqual(["detty", "lagos"]);
    expect(query.orGroups).toHaveLength(2);
    expect(query.orGroups[0]).toContain("title.ilike.%detty%");
    expect(query.orGroups[1]).toContain("city.ilike.%lagos%");
  });

  it("splits terms the same way the demo filter does, minus repeats", () => {
    const typed = "  Detty   RAVE detty ";
    expect(normaliseSearchTerms(typed)).toEqual([...new Set(searchTerms(typed))]);
    expect(normaliseSearchTerms(typed)).toEqual(["detty", "rave"]);
    expect(normaliseSearchTerms(undefined)).toEqual([]);
  });

  it("covers every field the demo filter searches", () => {
    const events = demoEvents(NOW);
    const terms = ["afrobeats", "lagos", "lekki", "amapiano", "brunch", "concert", "carnival", "fashion"];
    const textFilter: Record<string, (term: string) => string> = {
      title: (term) => `title.ilike.%${term}%`,
      venue: (term) => `venue.ilike.%${term}%`,
      city: (term) => `city.ilike.%${term}%`,
      description: (term) => `description.ilike.%${term}%`,
      tags: (term) => `tags.cs.{${term}}`,
    };

    for (const term of terms) {
      const filters = orFiltersForTerm(term);
      for (const event of events) {
        const fields: Record<string, string> = {
          title: event.title,
          venue: event.venue,
          city: event.city ?? "",
          description: event.description,
          tags: event.tags.join(" "),
        };
        for (const [field, value] of Object.entries(fields)) {
          if (!value.toLowerCase().includes(term)) continue;
          expect(filters, `${field} is searched for "${term}"`).toContain(textFilter[field]!(term));
        }
        if (categoryLabel(event.category).toLowerCase().includes(term)) {
          expect(filters.some((filter) => filter.startsWith("category.in.(") && filter.includes(event.category))).toBe(
            true,
          );
        }
        if (matchesQuery(event, term)) {
          expect(filters.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("search safety", () => {
  const SAFE_FILTER =
    /^(?:title|venue|city|description)\.ilike\.%[^%(){},"\\]*%$|^tags\.cs\.\{[^{},"\\]*\}$|^category\.in\.\([a-z_,]*\)$/;

  it("strips PostgREST separators and ILIKE wildcards from terms", () => {
    const terms = normaliseSearchTerms('rave%,title.ilike.%free (lagos) "x" *y* {z} a\\b');

    for (const term of terms) {
      expect(term).not.toMatch(/[%,(){}*"\\]/);
      expect(term).not.toMatch(/\s/);
    }
    expect(terms).toContain("rave");
  });

  it("cannot smuggle a second filter or a new clause into or()", () => {
    const query = buildDiscoveryQuery({ query: "x%,status.eq.archived)or(title.ilike.%*" });

    for (const group of query.orGroups) {
      for (const filter of group) {
        expect(filter).toMatch(SAFE_FILTER);
      }
    }
  });

  it("caps the query at 80 characters", () => {
    const long = "a".repeat(120);
    const terms = normaliseSearchTerms(long);

    expect(terms.join("")).toHaveLength(MAX_QUERY_LENGTH);
  });

  it("keeps the category list free of user input", () => {
    for (const filter of orFiltersForTerm("party")) {
      if (filter.startsWith("category.in.(")) {
        expect(filter).toBe("category.in.(party)");
      }
    }
  });
});

describe("invalid input", () => {
  it("ignores dates that are not real calendar days", () => {
    for (const date of ["2026-02-31", "2026-13-01", "24-11-2026", "not-a-date", ""]) {
      expect(normaliseDateParam(date)).toBe("");
      const query = buildDiscoveryQuery({ date, now: NOW });
      expect(query.range).toBeNull();
      expect(query.upcomingFrom).toBe(NOW.toISOString());
    }
  });

  it("accepts real dates", () => {
    expect(normaliseDateParam("2026-11-28")).toBe("2026-11-28");
    expect(normaliseDateParam("2028-02-29")).toBe("2028-02-29");
  });

  it("ignores unknown categories but keeps the quick shortcuts", () => {
    expect(normaliseCategoryParam("banana")).toBe("");
    expect(normaliseCategoryParam("music")).toBe("music");
    expect(normaliseCategoryParam("Today")).toBe("Today");
    expect(normaliseCategoryParam("Weekend")).toBe("Weekend");

    const query = buildDiscoveryQuery({ category: "banana", now: NOW });
    expect(query.category).toBeNull();
    expect(query.upcomingFrom).toBe(NOW.toISOString());
  });
});

describe("pagination clamping", () => {
  it("resolves an out-of-range page to the last page that exists", () => {
    expect(resolvePage(99, 25, 10)).toEqual({ page: 3, pageCount: 3, total: 25, from: 20, to: 29 });
  });

  it("keeps valid pages untouched", () => {
    expect(resolvePage(2, 25, 10)).toEqual({ page: 2, pageCount: 3, total: 25, from: 10, to: 19 });
    expect(resolvePage(1, 25, 10)).toMatchObject({ page: 1, from: 0 });
  });

  it("resolves empty datasets to page 1 of 1", () => {
    expect(resolvePage(99, 0, 10)).toEqual({ page: 1, pageCount: 1, total: 0, from: 0, to: 9 });
    expect(resolvePage(1, 0, 10).pageCount).toBe(1);
  });

  it("treats zero, negative and unparseable pages as page 1", () => {
    for (const page of [0, -5, Number.NaN]) {
      expect(resolvePage(page, 25, 10).page).toBe(1);
      expect(pageWindow(page, 10).page).toBe(1);
    }
    expect(pageWindow(undefined, 10)).toEqual({ page: 1, pageSize: 10, from: 0, to: 9 });
  });

  it("asks for the requested window up front and clamps after counting", () => {
    const query = buildDiscoveryQuery({ page: 99, now: NOW });

    expect({ from: query.from, to: query.to }).toEqual({ from: 980, to: 989 });
    expect(resolvePage(query.page, 25, query.pageSize)).toMatchObject({ page: 3, from: 20, to: 29 });
  });
});

describe("demo and production agreement", () => {
  it("keeps the same results for the audit search example", () => {
    const events = demoEvents(NOW).map((event) => ({
      ...event,
      isSaved: false,
    }));
    const demoHits = filterEvents(events, { q: "afrobeats" }, { now: NOW }).map((event) => event.id);
    const productionFields = buildDiscoveryQuery({ query: "afrobeats" }).orGroups.flat();

    expect(demoHits).toHaveLength(2);
    expect(productionFields).toContain("tags.cs.{afrobeats}");
  });

  it("filters the same events for a category and a date", () => {
    const events = demoEvents(NOW).map((event) => ({ ...event, isSaved: false }));
    const query = buildDiscoveryQuery({ category: "festival", date: dateKey(events[0]!.startsAt, LAGOS), now: NOW });
    const demoHits = filterEvents(events, { cat: "festival", date: dateKey(events[0]!.startsAt, LAGOS) }, { now: NOW });

    const productionHits = events.filter(
      (event) =>
        event.category === query.category &&
        Date.parse(event.startsAt) >= Date.parse(query.range!.start) &&
        Date.parse(event.startsAt) < Date.parse(query.range!.endExclusive),
    );

    expect(productionHits.map((event) => event.id)).toEqual(demoHits.map((event) => event.id));
  });
});
