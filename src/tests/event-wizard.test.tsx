import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EventWizard } from "@/components/organiser/EventWizard";
import { UIProvider } from "@/components/ui/UIProvider";

const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => router,
  usePathname: () => "/events/new",
}));

vi.mock("@/lib/actions/events", () => ({
  createEventAction: vi.fn(async () => ({ ok: true, id: "11111111-1111-4111-8111-111111111111" })),
  updateEventAction: vi.fn(async () => ({ ok: true, id: "11111111-1111-4111-8111-111111111111" })),
}));

vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: vi.fn() }));

const futureDate = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

function renderWizard() {
  render(
    <UIProvider>
      <EventWizard mode="create" preview />
    </UIProvider>,
  );
}

function next() {
  fireEvent.click(screen.getByRole("button", { name: /next/i }));
}

function toast() {
  return screen.getByRole("status").textContent ?? "";
}

function fillBasics() {
  fireEvent.change(screen.getByLabelText(/event \/ party name/i), { target: { value: "Lagos Rooftop Party" } });
  fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: futureDate() } });
}

function reachDetails() {
  fillBasics();
  next();
  expect(screen.getByText("Event Image")).toBeInTheDocument();
  next();
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("event creation wizard steps", () => {
  it("does not ask for a venue before the details screen is shown", () => {
    renderWizard();
    reachDetails();

    expect(screen.getByText("Event Details")).toBeInTheDocument();
    expect(screen.getByLabelText(/location \/ venue/i)).toBeInTheDocument();
    expect(toast()).not.toContain("Add a venue to continue.");
  });

  it("asks for the venue when leaving the details screen without one", () => {
    renderWizard();
    reachDetails();

    next();

    expect(toast()).toContain("Add a venue to continue.");
    expect(screen.getByText("Event Details")).toBeInTheDocument();
    expect(screen.queryByText("Table Reservations")).not.toBeInTheDocument();
  });

  it("asks for a description when leaving the details screen without one", () => {
    renderWizard();
    reachDetails();

    fireEvent.change(screen.getByLabelText(/location \/ venue/i), { target: { value: "Lekki Beach, Lagos" } });
    next();

    expect(toast()).toContain("Add a description of at least 10 characters.");
    expect(screen.queryByText("Table Reservations")).not.toBeInTheDocument();
  });

  it("continues to the reservations step once the details are complete", () => {
    renderWizard();
    reachDetails();

    fireEvent.change(screen.getByLabelText(/location \/ venue/i), { target: { value: "Lekki Beach, Lagos" } });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Sunset sets, afro house and small chops on the roof." },
    });
    next();

    expect(screen.getByText("Table Reservations")).toBeInTheDocument();
    expect(toast()).not.toContain("Add a venue to continue.");
  });
});
