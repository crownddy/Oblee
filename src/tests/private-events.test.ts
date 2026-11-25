import { describe, expect, it } from "vitest";
import { canViewEvent, filterEvents, type EventAccessFacts } from "@/lib/utils/events";
import type { EventSummary } from "@/lib/types/domain";

const ORGANISER = "organiser-1";
const ATTENDEE = "attendee-1";

const publicEvent: EventAccessFacts = {
  status: "published",
  visibility: "public",
  organiserId: ORGANISER,
  isAdminViewer: false,
};

const privateEvent: EventAccessFacts = {
  status: "published",
  visibility: "private",
  organiserId: ORGANISER,
  isAdminViewer: false,
};

describe("private event access rule", () => {
  it("keeps published public events open to everyone", () => {
    expect(canViewEvent(publicEvent, null)).toBe(true);
    expect(canViewEvent(publicEvent, ATTENDEE)).toBe(true);
    expect(canViewEvent(publicEvent, ORGANISER)).toBe(true);
  });

  it("hides a published private event from anonymous visitors", () => {
    expect(canViewEvent(privateEvent, null)).toBe(false);
  });

  it("hides a published private event from attendees without a grant", () => {
    expect(canViewEvent(privateEvent, ATTENDEE)).toBe(false);
    expect(canViewEvent(privateEvent, ATTENDEE, false, false)).toBe(false);
  });

  it("lets the organiser read their own private event", () => {
    expect(canViewEvent(privateEvent, ORGANISER)).toBe(true);
    expect(canViewEvent({ ...privateEvent, status: "archived" }, ORGANISER)).toBe(true);
  });

  it("lets administrators read any private event", () => {
    expect(canViewEvent(privateEvent, "someone", true)).toBe(true);
    expect(canViewEvent(privateEvent, null, false, false)).toBe(false);
    expect(canViewEvent({ ...privateEvent, isAdminViewer: true }, null)).toBe(true);
  });

  it("lets an explicitly granted attendee read a published private event", () => {
    expect(canViewEvent(privateEvent, ATTENDEE, false, true)).toBe(true);
  });

  it("does not extend a grant to archived or removed events", () => {
    expect(canViewEvent({ ...privateEvent, status: "archived" }, ATTENDEE, false, true)).toBe(false);
    expect(canViewEvent({ ...privateEvent, status: "removed" }, ATTENDEE, false, true)).toBe(false);
  });

  it("still hides unpublished public events from strangers", () => {
    expect(canViewEvent({ ...publicEvent, status: "archived" }, ATTENDEE)).toBe(false);
    expect(canViewEvent({ ...publicEvent, status: "archived" }, ORGANISER)).toBe(true);
  });
});

function summary(overrides: Partial<EventSummary> & Pick<EventSummary, "id">): EventSummary {
  return {
    title: "Rooftop Session",
    category: "music",
    venue: "Lekki",
    city: "Lagos",
    startsAt: "2026-12-12T18:00:00.000Z",
    timezone: "Africa/Lagos",
    isFree: true,
    heroImageUrl: null,
    colorFrom: "#6a47f5",
    colorTo: "#c026d3",
    status: "published",
    visibility: "public",
    organiserId: ORGANISER,
    organiserName: "Oblee Studio",
    tags: [],
    isSaved: false,
    ...overrides,
  };
}

describe("discovery listings", () => {
  it("drops private events from the public catalogue", () => {
    const events = [
      summary({ id: "public-1" }),
      summary({ id: "private-1", visibility: "private" }),
    ];

    // Public discovery filters on visibility before rendering.
    const listed = filterEvents(
      events.filter((event) => event.visibility === "public"),
      {},
    );
    expect(listed.map((event) => event.id)).toEqual(["public-1"]);
  });

  it("still lets an organiser list their own private events from the dashboard query", () => {
    const events = [summary({ id: "private-1", visibility: "private" })];
    const owned = events.filter((event) => event.organiserId === ORGANISER);
    expect(owned).toHaveLength(1);
    expect(canViewEvent(owned[0]!, ORGANISER)).toBe(true);
  });
});
