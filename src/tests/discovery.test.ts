import { describe, expect, it } from "vitest";
import {
  buildDiscoverHref,
  canEditEvent,
  canViewEvent,
  filterEvents,
  matchesQuery,
  pageNumbers,
  paginate,
  ticketSummary,
} from "@/lib/utils/events";
import { demoEvents, demoEventSummaries } from "@/lib/demo/events";
import type { EventSummary } from "@/lib/types/domain";

const LAGOS = "Africa/Lagos";
const NOW = new Date("2026-11-24T12:00:00Z");

function summary(overrides: Partial<EventSummary>): EventSummary {
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
    organiserId: "organiser-1",
    organiserName: "Oblee Studio",
    tags: ["afrobeats"],
    isSaved: false,
    ...overrides,
  };
}

describe("discovery filtering", () => {
  const events = [
    summary({ id: "a", title: "Detty Rave", startsAt: "2026-11-27T18:00:00.000Z" }),
    summary({ id: "b", title: "Sunset Brunch", category: "food", venue: "Ikoyi", tags: [] }),
    summary({ id: "c", title: "Removed Night", status: "removed" }),
    summary({ id: "d", title: "Archive Night", status: "archived" }),
  ];

  it("hides removed and archived events by default", () => {
    expect(filterEvents(events, {}, { now: NOW }).map((event) => event.id)).toEqual(["b", "a"]);
  });

  it("keeps archived events when asked", () => {
    expect(filterEvents(events, {}, { now: NOW, includeArchived: true })).toHaveLength(4);
  });

  it("sorts by start time", () => {
    expect(filterEvents(events, {}, { now: NOW })[0]?.id).toBe("b");
  });

  it("matches on title, venue and tags", () => {
    expect(matchesQuery(events[0]!, "detty")).toBe(true);
    expect(matchesQuery(events[1]!, "ikoyi")).toBe(true);
    expect(matchesQuery(events[0]!, "afrobeats")).toBe(true);
    expect(matchesQuery(events[1]!, "detty")).toBe(false);
  });

  it("requires every search term to match", () => {
    expect(matchesQuery(events[0]!, "detty lagos")).toBe(true);
    expect(matchesQuery(events[0]!, "detty abuja")).toBe(false);
    expect(matchesQuery(events[0]!, "   ")).toBe(true);
  });

  it("filters by category and date", () => {
    expect(filterEvents(events, { cat: "food" }, { now: NOW }).map((event) => event.id)).toEqual(["b"]);
    expect(filterEvents(events, { date: "2026-11-27" }, { now: NOW }).map((event) => event.id)).toEqual(["a"]);
  });

  it("supports the Today and Weekend shortcuts", () => {
    expect(filterEvents(events, { cat: "Today" }, { now: NOW }).map((event) => event.id)).toEqual(["b"]);
    expect(filterEvents(events, { cat: "Weekend" }, { now: NOW }).map((event) => event.id)).toEqual(["a"]);
  });
});

describe("pagination", () => {
  it("clamps out-of-range pages", () => {
    expect(paginate([1, 2, 3], 99, 2)).toMatchObject({ page: 2, pageCount: 2, total: 3 });
    expect(paginate([1, 2, 3], 0, 2).page).toBe(1);
  });

  it("builds a compact page list", () => {
    expect(pageNumbers(1, 5)).toEqual([1, 2, "…", 5]);
    expect(pageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("discovery links", () => {
  it("omits empty parameters and the first page", () => {
    expect(buildDiscoverHref({ q: "  ", page: 1 })).toBe("/");
    expect(buildDiscoverHref({ q: "rave", cat: "music", page: 2, path: "/explore" })).toBe(
      "/explore?q=rave&cat=music&page=2",
    );
  });
});

describe("event access rules", () => {
  const published = { status: "published" as const, organiserId: "organiser-1", isAdminViewer: false };
  const archived = { status: "archived" as const, organiserId: "organiser-1", isAdminViewer: false };
  const withFlags = { ...archived };

  it("lets anyone view published events", () => {
    expect(canViewEvent(published, null)).toBe(true);
  });

  it("hides drafts from strangers", () => {
    expect(canViewEvent(withFlags, "someone-else")).toBe(false);
  });

  it("shows drafts to their owner, admins and admin viewers", () => {
    expect(canViewEvent(withFlags, "organiser-1")).toBe(true);
    expect(canViewEvent(withFlags, null, true)).toBe(true);
    expect(canViewEvent({ ...withFlags, isAdminViewer: true }, null)).toBe(true);
  });

  it("only lets the owner or an admin edit an event", () => {
    expect(canEditEvent(published, "organiser-1")).toBe(true);
    expect(canEditEvent(published, "organiser-2")).toBe(false);
    expect(canEditEvent(published, "organiser-2", true)).toBe(true);
    expect(canEditEvent(published, null)).toBe(false);
  });

  it("blocks editing events that were removed", () => {
    expect(canEditEvent({ status: "removed", organiserId: "organiser-1" }, "organiser-1")).toBe(false);
  });
});

describe("ticket summary", () => {
  it("formats tiers and tables", () => {
    expect(
      ticketSummary(
        [{ name: "Regular", price: 20000 }],
        [{ seats: 4, quantity: 10 }],
      ),
    ).toEqual({ labels: ["Regular ₦20,000"], tablesLabel: "10 × table of 4" });
  });

  it("reports when no tables are offered", () => {
    expect(ticketSummary([], []).tablesLabel).toBe("No tables");
  });
});

describe("demo catalogue", () => {
  it("seeds published events with unique ids", () => {
    const events = demoEvents(NOW);
    expect(events.length).toBeGreaterThan(5);
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    expect(events.every((event) => event.status === "published")).toBe(true);
  });

  it("includes featured and future events", () => {
    const events = demoEvents(NOW);
    expect(events.some((event) => event.isFeatured)).toBe(true);
    expect(events.every((event) => new Date(event.startsAt).getTime() >= Date.parse("2026-11-24T00:00:00Z"))).toBe(true);
  });

  it("gives every demo event an RSVP contact", () => {
    expect(demoEvents(NOW).every((event) => event.contacts.length > 0)).toBe(true);
  });

  it("summarises without leaking detail-only fields", () => {
    const [first] = demoEventSummaries(NOW);
    expect(first).toBeDefined();
    expect(first).not.toHaveProperty("contacts");
    expect(first).not.toHaveProperty("description");
  });
});
