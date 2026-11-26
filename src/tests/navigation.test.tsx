import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BottomNav } from "@/components/layout/BottomNav";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { UIProvider } from "@/components/ui/UIProvider";
import { AppearancePicker } from "@/components/settings/AppearancePicker";
import SettingsPage from "@/app/settings/page";
import { THEME_PREF_KEY } from "@/lib/theme";

const route = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => route.pathname,
}));

beforeEach(() => {
  route.pathname = "/";
  localStorage.clear();
  document.documentElement.removeAttribute("data-mode");
});

afterEach(cleanup);

describe("bottom navigation", () => {
  it("keeps the existing items in order and points Profile at settings", () => {
    const { container } = render(<BottomNav />);

    const links = Array.from(container.querySelectorAll("a")).map((link) => [
      link.getAttribute("href"),
      (link.textContent ?? "").trim(),
    ]);

    expect(links).toEqual([
      ["/", "Home"],
      ["/explore", "Explore"],
      ["/events/new", ""],
      ["/saved", "Saved"],
      ["/settings", "Profile"],
    ]);
  });

  it("keeps the Profile tab label, icon and size", () => {
    const { container } = render(<BottomNav />);
    const profile = screen.getByRole("link", { name: "Profile" });

    expect(profile).toHaveTextContent("Profile");
    expect(profile.querySelector("svg")).not.toBeNull();
    expect(container.querySelectorAll(".nav a:not(.plus)")).toHaveLength(4);
    expect(container.querySelector(".nav .plus")).not.toBeNull();
  });

  it("marks Profile as the current tab on the settings page", () => {
    route.pathname = "/settings";
    render(<BottomNav />);

    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });
});

describe("header profile icon", () => {
  it("sends signed-out visitors to log in", () => {
    render(<SiteHeader signedIn={false} />);

    const link = screen.getByRole("link", { name: /log in or register/i });
    expect(link).toHaveAttribute("href", "/login");
    expect(link).toHaveClass("av");
    expect(link.querySelector("svg")).not.toBeNull();
  });

  it("sends signed-in visitors to their profile", () => {
    render(<SiteHeader signedIn displayName="Ada Obi" />);

    const link = screen.getByRole("link", { name: /your profile, signed in as ada obi/i });
    expect(link).toHaveAttribute("href", "/profile");
    expect(link).toHaveTextContent("A");
  });

  it("no longer opens the appearance sheet", () => {
    render(<SiteHeader signedIn={false} />);

    expect(screen.queryByRole("button", { name: /appearance/i })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("settings appearance", () => {
  it("applies, remembers and confirms the chosen look", () => {
    render(
      <UIProvider>
        <AppearancePicker />
      </UIProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /dark mode/i }));

    expect(document.documentElement.getAttribute("data-mode")).toBe("dark");
    expect(JSON.parse(localStorage.getItem(THEME_PREF_KEY) ?? "{}").mode).toBe("dark");
    expect(screen.getByRole("status")).toHaveTextContent("Dark mode is on.");
  });

  it("keeps the previously stored look selected", () => {
    localStorage.setItem(THEME_PREF_KEY, JSON.stringify({ mode: "glass" }));

    render(
      <UIProvider>
        <AppearancePicker />
      </UIProvider>,
    );

    expect(screen.getByRole("button", { name: /glassmorphism/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /classic/i })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("settings page", () => {
  it("renders the appearance picker and the settings sections", async () => {
    render(<UIProvider>{await SettingsPage()}</UIProvider>);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dark mode/i })).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Privacy & safety" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Terms of service" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "About Oblee" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "App version" })).toBeInTheDocument();
  });

  it("links privacy and terms to the existing pages", async () => {
    render(<UIProvider>{await SettingsPage()}</UIProvider>);

    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute("href", "/terms");
  });

  it("shows the app version without inventing notification controls", async () => {
    render(<UIProvider>{await SettingsPage()}</UIProvider>);

    expect(screen.getByText(/^v\d+\.\d+\.\d+$/)).toBeInTheDocument();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
