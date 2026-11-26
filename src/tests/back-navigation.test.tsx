import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BackButton } from "@/components/ui/BackButton";
import { NavigationMemory } from "@/components/layout/NavigationMemory";
import { PageHeader } from "@/components/ui/PageHeader";
import PrivacyPage from "@/app/privacy/page";
import {
  canGoBack,
  goBackToOrigin,
  previousLocation,
  readScroll,
  recordLocation,
  resetHistory,
  saveScroll,
} from "@/lib/navigation/history";

const route = vi.hoisted(() => ({ pathname: "/settings" }));
const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => route.pathname,
  useRouter: () => router,
}));

beforeEach(() => {
  sessionStorage.clear();
  route.pathname = "/settings";
  router.back.mockClear();
  router.push.mockClear();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("in-app navigation trail", () => {
  it("has no predecessor for a direct entry", () => {
    resetHistory("/privacy");

    expect(previousLocation()).toBeNull();
    expect(canGoBack()).toBe(false);
  });

  it("remembers the screen a page was opened from", () => {
    resetHistory("/settings");
    expect(recordLocation("/privacy")).toBe("push");

    expect(previousLocation()).toBe("/settings");
    expect(canGoBack()).toBe(true);
  });

  it("steps back one entry when the browser goes back", () => {
    resetHistory("/settings");
    recordLocation("/privacy");

    expect(recordLocation("/settings", { popped: true })).toBe("pop");
    expect(previousLocation()).toBeNull();
  });

  it("keeps a fresh visit to an earlier screen as a new entry", () => {
    resetHistory("/");
    recordLocation("/settings");

    expect(recordLocation("/")).toBe("push");
    expect(previousLocation()).toBe("/settings");
  });

  it("ignores repeated records of the screen already on", () => {
    resetHistory("/settings");

    expect(recordLocation("/settings")).toBe("stay");
    expect(previousLocation()).toBeNull();
  });

  it("keeps the scroll offset per screen", () => {
    saveScroll("/explore", 640.4);

    expect(readScroll("/explore")).toBe(640);
    expect(readScroll("/saved")).toBeNull();
  });
});

describe("goBackToOrigin", () => {
  it("uses the browser history when the app has a predecessor", () => {
    resetHistory("/settings");
    recordLocation("/privacy");

    goBackToOrigin(router, "/settings");

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("uses the fallback destination for a direct entry", () => {
    resetHistory("/privacy");

    goBackToOrigin(router, "/settings");

    expect(router.push).toHaveBeenCalledWith("/settings");
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe("header back control", () => {
  it("stays a link to the fallback when there is no history", () => {
    resetHistory("/privacy");
    render(<PageHeader title="Privacy Policy" backHref="/settings" variant="close" />);

    const link = screen.getByRole("link", { name: "Close" });
    expect(link).toHaveAttribute("href", "/settings");
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();

    fireEvent.click(link);
    expect(router.back).not.toHaveBeenCalled();
  });

  it("returns to the referring screen when there is history", () => {
    resetHistory("/settings");
    recordLocation("/privacy");
    render(<PageHeader title="Privacy Policy" backHref="/settings" variant="close" />);

    fireEvent.click(screen.getByRole("link", { name: "Close" }));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("leaves the default behaviour alone for modified clicks", () => {
    resetHistory("/settings");
    recordLocation("/privacy");
    render(<PageHeader title="Privacy Policy" backHref="/settings" />);

    fireEvent.click(screen.getByRole("link", { name: "Back" }), { metaKey: true });

    expect(router.back).not.toHaveBeenCalled();
  });
});

describe("event details back control", () => {
  it("returns to the list the event was opened from", () => {
    resetHistory("/explore");
    recordLocation("/events/abc");
    render(<BackButton />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("falls back to discovery for a shared event link", () => {
    resetHistory("/events/abc");
    render(<BackButton />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(router.push).toHaveBeenCalledWith("/");
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe("direct entry to a legal page", () => {
  it("offers the settings screen as the way out", () => {
    resetHistory("/privacy");
    render(<PrivacyPage />);

    expect(screen.getByRole("link", { name: "Close" })).toHaveAttribute("href", "/settings");
  });
});

describe("returning to a screen restores its scroll position", () => {
  it("puts the list back where it was", async () => {
    history.replaceState(null, "", "/explore");
    route.pathname = "/explore";
    const { rerender } = render(<NavigationMemory />);

    const body = document.createElement("div");
    body.className = "body";
    document.body.appendChild(body);
    body.scrollTop = 500;
    body.dispatchEvent(new Event("scroll"));

    history.replaceState(null, "", "/events/abc");
    route.pathname = "/events/abc";
    rerender(<NavigationMemory />);

    body.scrollTop = 0;
    history.replaceState(null, "", "/explore");
    window.dispatchEvent(new PopStateEvent("popstate"));
    route.pathname = "/explore";
    rerender(<NavigationMemory />);

    await waitFor(() => expect(body.scrollTop).toBe(500));
    expect(previousLocation()).toBeNull();
  });

  it("does not record the return as a new visit", () => {
    history.replaceState(null, "", "/saved");
    route.pathname = "/saved";
    const { rerender } = render(<NavigationMemory />);

    history.replaceState(null, "", "/events/abc");
    route.pathname = "/events/abc";
    rerender(<NavigationMemory />);
    expect(previousLocation()).toBe("/saved");

    history.replaceState(null, "", "/saved");
    window.dispatchEvent(new PopStateEvent("popstate"));
    route.pathname = "/saved";
    rerender(<NavigationMemory />);

    expect(previousLocation()).toBeNull();
  });
});
