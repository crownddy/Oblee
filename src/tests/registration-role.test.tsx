import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RegisterForm } from "@/components/auth/AuthForms";

vi.mock("@/lib/actions/auth", () => ({
  registerAction: vi.fn(async () => ({ status: "idle" })),
  loginAction: vi.fn(async () => ({ status: "idle" })),
  logoutAction: vi.fn(async () => undefined),
  forgotPasswordAction: vi.fn(async () => ({ status: "idle" })),
  resetPasswordAction: vi.fn(async () => ({ status: "idle" })),
  resendVerificationAction: vi.fn(async () => ({ status: "idle" })),
}));

afterEach(() => {
  cleanup();
});

const attendee = () => screen.getByRole("radio", { name: /attend events/i });
const organiser = () => screen.getByRole("radio", { name: /host events/i });
const card = (radio: HTMLElement) => radio.closest("label") as HTMLLabelElement;

describe("registration role picker", () => {
  it("shows attendee as the highlighted choice to begin with", () => {
    render(<RegisterForm next="/" />);

    expect(attendee()).toBeChecked();
    expect(organiser()).not.toBeChecked();
    expect(card(attendee()).className).toContain("on");
    expect(card(organiser()).className).not.toContain("on");
  });

  it("highlights the host card as soon as it is tapped", () => {
    render(<RegisterForm next="/" />);

    fireEvent.click(card(organiser()));

    expect(organiser()).toBeChecked();
    expect(attendee()).not.toBeChecked();
    expect(card(organiser()).className).toContain("on");
    expect(card(attendee()).className).not.toContain("on");
  });

  it("lets the reader switch back to attendee", () => {
    render(<RegisterForm next="/" />);

    fireEvent.click(card(organiser()));
    fireEvent.click(card(attendee()));

    expect(attendee()).toBeChecked();
    expect(card(attendee()).className).toContain("on");
    expect(card(organiser()).className).not.toContain("on");
  });

  it("submits the chosen role", () => {
    render(<RegisterForm next="/" />);

    fireEvent.click(card(organiser()));

    const data = new FormData(card(organiser()).closest("form") as HTMLFormElement);
    expect(data.get("role")).toBe("organiser");
  });
});
