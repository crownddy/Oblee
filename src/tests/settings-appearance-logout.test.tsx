import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UIProvider } from "@/components/ui/UIProvider";
import { THEMES, type ThemeValue } from "@/lib/constants";
import { THEME_PREF_KEY } from "@/lib/theme";

const viewer = vi.hoisted(() => ({ value: null as null | { id: string; email: string; profile: unknown } }));

vi.mock("@/lib/auth/session", () => ({
  getViewer: vi.fn(async () => viewer.value),
  requireUser: vi.fn(async () => viewer.value),
}));

vi.mock("@/lib/actions/auth", () => ({
  logoutAction: vi.fn(async () => undefined),
}));

const { default: SettingsPage } = await import("@/app/settings/page");
const { logoutAction } = await import("@/lib/actions/auth");

const renderSettings = async () => render(<UIProvider>{await SettingsPage()}</UIProvider>);
const appearance = () => screen.getByRole("button", { name: /appearance/i });
const panel = () => within(document.getElementById(appearance().getAttribute("aria-controls") as string) as HTMLElement);

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-mode");
  viewer.value = null;
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("appearance accordion", () => {
  it("starts collapsed with a single row", async () => {
    await renderSettings();

    expect(appearance()).toHaveAttribute("aria-expanded", "false");
    expect(appearance()).toHaveAttribute("type", "button");
    expect(screen.queryByRole("button", { name: /dark mode/i })).toBeNull();
  });

  it("points aria-controls at the panel it hides", async () => {
    await renderSettings();

    const panelId = appearance().getAttribute("aria-controls");
    expect(panelId).toBeTruthy();

    const panel = document.getElementById(panelId as string);
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("hidden");
    expect(panel).toHaveAttribute("role", "region");
    expect(panel).toHaveAttribute("aria-labelledby", appearance().id);
  });

  it("expands on click and collapses again", async () => {
    const user = userEvent.setup();
    await renderSettings();

    await user.click(appearance());
    expect(appearance()).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(appearance().getAttribute("aria-controls") as string)).not.toHaveAttribute("hidden");

    await user.click(appearance());
    expect(appearance()).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(appearance().getAttribute("aria-controls") as string)).toHaveAttribute("hidden");
  });

  it("is keyboard operable", async () => {
    const user = userEvent.setup();
    await renderSettings();

    appearance().focus();
    await user.keyboard("{Enter}");
    expect(appearance()).toHaveAttribute("aria-expanded", "true");

    await user.keyboard(" ");
    expect(appearance()).toHaveAttribute("aria-expanded", "false");
  });

  it("reveals every existing theme, unchanged", async () => {
    const user = userEvent.setup();
    await renderSettings();
    await user.click(appearance());

    const labels = THEMES.map((theme) => theme.label);
    expect(labels).toEqual(["Classic", "Dark mode", "Glassmorphism", "Minimalist", "Vibrant 3D", "Christmas"]);

    for (const label of labels) {
      expect(panel().getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
  });

  it("names the theme currently in use on the collapsed row", async () => {
    localStorage.setItem(THEME_PREF_KEY, JSON.stringify({ mode: "xmas" }));
    await renderSettings();

    expect(appearance()).toHaveTextContent("Appearance");
    expect(appearance()).toHaveTextContent("Christmas");
    expect(appearance()).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps applying and remembering the chosen theme", async () => {
    const user = userEvent.setup();
    await renderSettings();
    await user.click(appearance());
    await user.click(panel().getByRole("button", { name: /christmas/i }));

    expect(document.documentElement.getAttribute("data-mode")).toBe("xmas");
    expect(JSON.parse(localStorage.getItem(THEME_PREF_KEY) ?? "{}").mode).toBe<ThemeValue>("xmas");
    expect(panel().getByRole("button", { name: /christmas/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Christmas is on.");
    expect(appearance()).toHaveTextContent("Christmas");
  });
});

describe("log out on the settings screen", () => {
  const signedIn = { id: "u1", email: "ada@oblee.app", profile: { fullName: "Ada Obi", role: "attendee" } };

  it("sits after the settings content, not at the top", async () => {
    viewer.value = signedIn;
    await renderSettings();

    const logout = screen.getByRole("button", { name: /log out/i });
    const appearanceRow = appearance();
    const version = screen.getByText(/^v\d+\.\d+\.\d+$/);

    expect(appearanceRow.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(version.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("submits the existing logout action and nothing else", async () => {
    viewer.value = signedIn;
    const user = userEvent.setup();
    await renderSettings();

    const logout = screen.getByRole("button", { name: /log out/i });
    expect(logout).toHaveAttribute("type", "submit");
    expect(logout.closest("form")).not.toBeNull();
    expect(logout).toHaveClass("logout");

    await user.click(appearance());
    expect(logoutAction).not.toHaveBeenCalled();
  });

  it("is absent for signed-out visitors", async () => {
    await renderSettings();

    expect(screen.queryByRole("button", { name: /log out/i })).toBeNull();
    expect(document.querySelector(".logoutwrap")).toBeNull();
  });
});
