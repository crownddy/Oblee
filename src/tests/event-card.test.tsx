import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EventCard } from "@/components/events/EventCard";
import { UIProvider } from "@/components/ui/UIProvider";
import { demoEventSummaries } from "@/lib/demo/events";
import type { EventSummary } from "@/lib/types/domain";
import { priceLabel, pricingFrom } from "@/lib/utils/events";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/explore",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

const NOW = new Date("2026-11-24T12:00:00Z");

function summary(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id: "event-1",
    title: "Detty Rave",
    category: "music",
    venue: "Lekki",
    city: "Lagos",
    startsAt: "2026-11-27T20:00:00.000Z",
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

afterEach(cleanup);

function renderCard(event: EventSummary, signedIn = false) {
  return render(
    <UIProvider>
      <EventCard event={event} signedIn={signedIn} />
    </UIProvider>,
  );
}

describe("pricingFrom", () => {
  it("keeps free events priceless even when tiers exist", () => {
    expect(pricingFrom(true, [20000, 45000])).toEqual({ priceFrom: null, priceTierCount: 2 });
  });

  it("uses the cheapest tier for paid events", () => {
    expect(pricingFrom(false, [45000, 20000, 150000])).toEqual({ priceFrom: 20000, priceTierCount: 3 });
  });

  it("stays unknown when a paid event has no usable tier", () => {
    expect(pricingFrom(false, [])).toEqual({ priceFrom: null, priceTierCount: 0 });
    expect(pricingFrom(false, [0, -100, Number.NaN, "free"])).toEqual({ priceFrom: null, priceTierCount: 0 });
  });

  it("accepts numeric strings from the database", () => {
    expect(pricingFrom(false, ["25000.00", "60000.00"])).toEqual({ priceFrom: 25000, priceTierCount: 2 });
  });
});

describe("priceLabel", () => {
  it("shows FREE only when the event is explicitly free", () => {
    expect(priceLabel({ isFree: true, priceFrom: null, priceTierCount: 0 })).toBe("FREE");
  });

  it("shows the actual price when there is one", () => {
    expect(priceLabel({ isFree: false, priceFrom: 15000, priceTierCount: 1 })).toBe("₦15,000");
  });

  it("says From when several tiers exist", () => {
    expect(priceLabel({ isFree: false, priceFrom: 20000, priceTierCount: 3 })).toBe("From ₦20,000");
  });

  it("shows nothing when the price is unknown", () => {
    expect(priceLabel({ isFree: false, priceFrom: null, priceTierCount: 0 })).toBeNull();
  });

  it("never guesses a price for free events that also carry tiers", () => {
    expect(priceLabel({ isFree: true, priceFrom: 20000, priceTierCount: 2 })).toBe("FREE");
  });
});

describe("event card price", () => {
  it("badges free events", () => {
    renderCard(summary());

    expect(screen.getByText("FREE")).toHaveClass("pb", "free");
  });

  it("badges the cheapest paid price", () => {
    renderCard(summary({ isFree: false, priceFrom: 20000, priceTierCount: 3 }));

    expect(screen.getByText("From ₦20,000")).toHaveClass("pb");
    expect(screen.queryByText("FREE")).toBeNull();
  });

  it("shows no badge when a paid event has no pricing", () => {
    renderCard(summary({ isFree: false, priceFrom: null, priceTierCount: 0 }));

    expect(document.querySelector(".pb")).toBeNull();
    expect(screen.queryByText("FREE")).toBeNull();
    expect(screen.queryByText(/₦/)).toBeNull();
  });
});

describe("event card organiser", () => {
  it("shows the public organiser name", () => {
    renderCard(summary({ organiserName: "Lagos Nights" }));

    expect(screen.getByText("Lagos Nights")).toHaveClass("ev-org");
  });

  it("omits the organiser line when the profile is unavailable", () => {
    renderCard(summary({ organiserName: null, tags: [] }));

    expect(document.querySelector(".ev-org")).toBeNull();
    expect(document.querySelector(".ev-foot")).toBeNull();
  });

  it("renders nothing beyond the organiser name from the profile", () => {
    renderCard(summary({ organiserName: "Lagos Nights" }));

    const card = document.querySelector(".ev") as HTMLElement;
    expect(card.textContent).not.toMatch(/@|email|phone|\+234/);
  });
});

describe("event card tags", () => {
  it("shows two tags and counts the rest", () => {
    renderCard(summary({ tags: ["afrobeats", "live music", "lagos", "party"] }));

    const tags = [...document.querySelectorAll(".ev-tag")].map((tag) => tag.textContent);
    expect(tags).toEqual(["afrobeats", "live music", "+2"]);
  });

  it("shows no overflow marker when every tag fits", () => {
    renderCard(summary({ tags: ["brunch"] }));

    expect([...document.querySelectorAll(".ev-tag")].map((tag) => tag.textContent)).toEqual(["brunch"]);
  });

  it("renders no tag row when the event has no tags", () => {
    renderCard(summary({ tags: [] }));

    expect(document.querySelector(".ev-tag")).toBeNull();
    expect(document.querySelector(".ev-foot")).not.toBeNull();
  });
});

describe("event card status", () => {
  it.each(["published", "archived", "removed"] as const)("shows no status label for %s", (status) => {
    renderCard(summary({ status }));

    expect(screen.queryByText(/sold out/i)).toBeNull();
    expect(screen.queryByText(/cancel/i)).toBeNull();
    expect(document.querySelector(".pb")?.textContent).toBe("FREE");
  });
});

describe("event card accessibility", () => {
  it("describes the event, price and organiser on the card link", () => {
    renderCard(summary({ isFree: false, priceFrom: 20000, priceTierCount: 2 }));

    const link = screen.getByRole("link", { name: /Detty Rave/ });
    const label = link.getAttribute("aria-label") ?? "";
    expect(label).toContain("FRI 27 NOV");
    expect(label).toContain("Lekki, Lagos");
    expect(label).toContain("From ₦20,000");
    expect(label).toContain("hosted by Oblee Events");
  });

  it("keeps the save control reachable and labelled", () => {
    renderCard(summary());

    expect(screen.getByRole("button", { name: "Save Detty Rave" })).toBeInTheDocument();
  });

  it("marks the saved state for assistive tech", () => {
    renderCard(summary({ isSaved: true }), true);

    expect(screen.getByRole("button", { name: "Remove Detty Rave from saved" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("demo cards carry real card data", () => {
  it("has both free and priced events with known prices", () => {
    const events = demoEventSummaries(NOW);

    expect(events.some((event) => event.isFree && event.priceFrom === null)).toBe(true);
    const paid = events.filter((event) => !event.isFree);
    expect(paid.length).toBeGreaterThan(0);
    for (const event of paid) {
      expect(event.priceFrom).toBeGreaterThan(0);
      expect(event.priceTierCount).toBeGreaterThan(0);
    }
  });

  it("never invents tags or organiser names", () => {
    for (const event of demoEventSummaries(NOW)) {
      expect(Array.isArray(event.tags)).toBe(true);
      expect(event.organiserName === null || event.organiserName.length > 0).toBe(true);
    }
  });
});
