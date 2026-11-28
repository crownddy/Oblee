import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FeaturedCarousel } from "@/components/events/FeaturedCarousel";
import { FEATURED_LIMIT } from "@/lib/constants";
import { FEATURED_ELIGIBILITY_FILTERS } from "@/lib/services/events";
import type { EventSummary } from "@/lib/types/domain";
import { carouselEvents, shouldShowCarousel } from "@/lib/utils/discovery";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

function event(id: string, overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id,
    title: `Event ${id}`,
    category: "music",
    venue: "Lekki",
    city: "Lagos",
    startsAt: "2026-12-05T20:00:00.000Z",
    timezone: "Africa/Lagos",
    isFree: true,
    heroImageUrl: null,
    colorFrom: "#6a47f5",
    colorTo: "#c026d3",
    status: "published",
    visibility: "public",
    organiserId: "organiser-1",
    organiserName: "Oblee Events",
    tags: [],
    priceFrom: null,
    priceTierCount: 0,
    isSaved: false,
    ...overrides,
  };
}

const ids = (events: EventSummary[]) => events.map((item) => item.id);
const LIST = [event("a"), event("b"), event("c")];

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("carousel source", () => {
  it("prefers featured events over the discovery list", () => {
    expect(ids(carouselEvents([event("f1"), event("f2")], LIST))).toEqual(["f1", "f2"]);
  });

  it("falls back to the discovery list when nothing is featured", () => {
    expect(ids(carouselEvents([], LIST))).toEqual(["a", "b", "c"]);
  });

  it("caps the fallback at the featured limit", () => {
    const many = Array.from({ length: FEATURED_LIMIT + 4 }, (_, index) => event(`p${index}`));

    const slides = carouselEvents([], many);

    expect(slides).toHaveLength(FEATURED_LIMIT);
    expect(ids(slides)).toEqual(ids(many).slice(0, FEATURED_LIMIT));
  });

  it("caps featured events at the same limit", () => {
    const many = Array.from({ length: FEATURED_LIMIT + 2 }, (_, index) => event(`f${index}`));

    expect(carouselEvents(many, LIST)).toHaveLength(FEATURED_LIMIT);
  });

  it("never repeats an event", () => {
    const slides = carouselEvents([], [event("a"), event("a"), event("b"), event("b"), event("c")]);

    expect(ids(slides)).toEqual(["a", "b", "c"]);
  });

  it("does not pad featured slides with discovery events", () => {
    const slides = carouselEvents([event("f1")], LIST);

    expect(ids(slides)).toEqual(["f1"]);
  });

  it("returns nothing when there are no eligible events", () => {
    expect(carouselEvents([], [])).toEqual([]);
  });
});

describe("carousel visibility", () => {
  it("renders for a single eligible event", () => {
    const slides = carouselEvents([], [event("a")]);

    expect(shouldShowCarousel("home", { query: "", date: "" }, slides)).toBe(true);
  });

  it("hides when no event is eligible", () => {
    expect(shouldShowCarousel("home", { query: "", date: "" }, [])).toBe(false);
  });

  it("steps aside while a search term is active", () => {
    expect(shouldShowCarousel("home", { query: "rave", date: "" }, LIST)).toBe(false);
  });

  it("steps aside while a date filter is active", () => {
    expect(shouldShowCarousel("home", { query: "", date: "2026-12-05" }, LIST)).toBe(false);
  });

  it("keeps rendering for a category-only browse", () => {
    // Category filtering is not part of the carousel condition, exactly as before.
    expect(shouldShowCarousel("home", { query: "", date: "" }, LIST)).toBe(true);
  });

  it("never renders on the explore route", () => {
    expect(shouldShowCarousel("explore", { query: "", date: "" }, LIST)).toBe(false);
  });
});

describe("one slide renders the carousel", () => {
  it("mounts the carousel with a single event", () => {
    render(<FeaturedCarousel events={carouselEvents([], [event("solo", { title: "Only Party" })])} />);

    expect(screen.getByRole("region", { name: "Featured events" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Only Party, 1 of 1" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })[0]).toHaveTextContent("Only Party");
  });

  it("renders nothing when handed an empty list", () => {
    const { container } = render(<FeaturedCarousel events={[]} />);

    expect(container.querySelector(".cz")).toBeNull();
  });
});

describe("featured query eligibility", () => {
  it("filters published public events, not just archived ones", () => {
    expect(FEATURED_ELIGIBILITY_FILTERS.map((filter) => ({ ...filter }))).toEqual([
      { column: "events.status", value: "published" },
      { column: "events.visibility", value: "public" },
    ]);
  });

  it("applies eligibility before the limit in the featured query", () => {
    const source = readFileSync(path.join(process.cwd(), "src/lib/services/events.ts"), "utf8");
    const start = source.indexOf("export async function listFeaturedEvents");
    const body = source.slice(start, source.indexOf("\nexport async function", start + 10));

    expect(start).toBeGreaterThan(-1);
    const eligibility = body.indexOf("FEATURED_ELIGIBILITY_FILTERS");
    const limit = body.indexOf(".limit(limit)");
    expect(eligibility).toBeGreaterThan(-1);
    expect(limit).toBeGreaterThan(-1);
    expect(eligibility).toBeLessThan(limit);
    expect(body).toContain('.select(`rank, events!inner(');
  });
});
