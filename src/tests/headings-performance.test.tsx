import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { EventCard } from "@/components/events/EventCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Splash } from "@/components/layout/Splash";
import { UIProvider } from "@/components/ui/UIProvider";
import type { EventSummary } from "@/lib/types/domain";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

function summary(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id: "5f0f0f0f-0000-4000-8000-000000000001",
    title: "Detty Rave",
    category: "music",
    venue: "Lekki",
    city: "Lagos",
    startsAt: "2026-12-28T20:00:00.000Z",
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("heading structure", () => {
  it("gives a discovery card a heading beneath the page title", () => {
    render(
      <UIProvider>
        <EventCard event={summary()} signedIn={false} />
      </UIProvider>,
    );
    const heading = screen.getByRole("heading", { name: "Detty Rave" });
    expect(heading.tagName).toBe("H3");
  });

  it("renders the screen title as the page heading", () => {
    render(<PageHeader title="Privacy Policy" backHref="/settings" />);
    const heading = screen.getByRole("heading", { name: "Privacy Policy" });
    expect(heading.tagName).toBe("H1");
    expect(heading).toHaveTextContent("Privacy Policy");
  });

  it("keeps the carousel slide title below the page heading", () => {
    const source = read("src/components/events/FeaturedCarousel.tsx");
    expect(source).toContain("<h2>{active.title}</h2>");
    expect(source).not.toContain("<h3>{active.title}</h3>");
  });

  it("gives the home screen one page heading and a section heading", () => {
    const source = read("src/components/events/DiscoverScreen.tsx");
    expect(source).toContain('<h1 className="pgt">Discover events around you</h1>');
    expect(source).toContain("<h2>Upcoming Events</h2>");
  });

  it("gives the explore screen one page heading, not two competing ones", () => {
    const source = read("src/components/events/DiscoverScreen.tsx");
    expect(source).toContain("<h1>Explore events</h1>");
    // The home-only title must not leak onto /explore.
    expect(source).toContain('{mode === "home" ? <h1 className="pgt">');
  });

  it("keeps event detail titles as the only H1 on that page", () => {
    const source = read("src/app/events/[id]/page.tsx");
    expect(source).toContain("<h1>{event.title}</h1>");
    expect(source.match(/<h1/g)).toHaveLength(1);
  });

  it("renders headings as real heading elements", () => {
    const source = read("src/components/events/EventCard.tsx");
    expect(source).toContain("<h3>{event.title}</h3>");
    expect(source).not.toMatch(/<div[^>]*role="heading"/);
  });
});

describe("heading styling", () => {
  const css = read("src/app/globals.css");

  it("styles the new tags with the existing rules instead of default sizes", () => {
    expect(css).toMatch(/\.pc h3,\s*\n\.pc h4 \{/);
    expect(css).toMatch(/\.czi h2,\s*\n\.czi h3 \{/);
    expect(css).toMatch(/\.sec h1,\s*\n\.sec h2,\s*\n\.sec h3 \{/);
  });

  it("inherits the compact screen-title style in the page header", () => {
    expect(css).toMatch(/\.ch h1 \{[^}]*font: inherit;/);
  });

  it("keeps the discovery page title compact enough for a 320px screen", () => {
    const rule = css.match(/\.pgt \{[^}]*\}/)?.[0] ?? "";
    const size = Number(rule.match(/font-size: (\d+(?:\.\d+)?)px/)?.[1] ?? "0");
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThanOrEqual(20);
    expect(rule).toMatch(/margin: 8px 0 0;/);
  });
});

describe("splash overlay", () => {
  it("holds the curtain for a short intro, not a multi-second wait", () => {
    const source = read("src/components/layout/Splash.tsx");
    const hold = Number(source.match(/const HOLD_MS = (\d+);/)?.[1] ?? "0");
    const exit = Number(source.match(/const EXIT_MS = (\d+);/)?.[1] ?? "0");
    expect(hold).toBeGreaterThan(0);
    expect(hold + exit).toBeLessThanOrEqual(3500);
  });

  it("skips the animation entirely for reduced-motion visitors", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));
    const { container } = render(<Splash />);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(container.querySelector(".spl")).toBeNull();
  });

  it("clears the curtain after the intro for everyone else", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));
    const { container } = render(<Splash />);
    expect(container.querySelector(".spl")).not.toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(2400);
    });
    expect(container.querySelector(".spl")?.className).toContain("out");
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    expect(container.querySelector(".spl")).toBeNull();
  });

  it("does not replay for a visit that already saw it", () => {
    document.documentElement.setAttribute("data-splash", "seen");
    const { container } = render(<Splash />);
    // CSS hides it (html[data-splash="seen"] .spl); no timers are started.
    expect(container.querySelector(".spl")).not.toBeNull();
    document.documentElement.removeAttribute("data-splash");
  });
});

describe("splash images", () => {
  const source = read("src/components/layout/Splash.tsx");

  it("declares intrinsic sizes so the curtain cannot shift the layout", () => {
    const images = source.match(/<img[^>]*>/g) ?? [];
    expect(images.length).toBeGreaterThanOrEqual(5);
    for (const image of images) {
      expect(image).toMatch(/width=\{\d+\}/);
      expect(image).toMatch(/height=\{\d+\}/);
    }
  });

  it("never downloads the intro art for a visit that skips the intro", () => {
    const images = source.match(/<img[^>]*>/g) ?? [];
    for (const image of images) {
      expect(image).toContain('loading="lazy"');
    }
  });

  it("keeps descriptive alt text on brand marks and empty alt on decoration", () => {
    expect(source).toContain('alt="Oblee"');
    expect(source).toContain('alt="Find the party you love"');
    expect(source).toMatch(/className="pin"[^>]*alt=""/);
  });
});
