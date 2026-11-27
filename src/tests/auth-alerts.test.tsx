import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  ForgotPasswordForm,
  LoginForm,
  RegisterForm,
  ResendVerificationForm,
  ResetPasswordForm,
} from "@/components/auth/AuthForms";
import { AgeVerificationForm } from "@/components/profile/AgeVerificationForm";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resendVerificationAction,
  resetPasswordAction,
} from "@/lib/actions/auth";
import { submitDateOfBirthAction } from "@/lib/actions/age";

vi.mock("@/lib/actions/auth", () => ({
  registerAction: vi.fn(async () => ({ status: "idle" as const })),
  resetPasswordAction: vi.fn(async () => ({ status: "idle" as const })),
  loginAction: vi.fn(async () => ({ status: "idle" as const })),
  logoutAction: vi.fn(async () => undefined),
  forgotPasswordAction: vi.fn(async () => ({ status: "idle" as const })),
  resendVerificationAction: vi.fn(async () => ({ status: "idle" as const })),
}));

vi.mock("@/lib/actions/age", () => ({
  submitDateOfBirthAction: vi.fn(async () => ({ status: "idle" as const })),
}));

const register = vi.mocked(registerAction);
const login = vi.mocked(loginAction);
const reset = vi.mocked(resetPasswordAction);
const age = vi.mocked(submitDateOfBirthAction);
const forgot = vi.mocked(forgotPasswordAction);
const resend = vi.mocked(resendVerificationAction);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

const typeInto = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const click = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));

function fillRegistration() {
  typeInto("Full name", "Ada Obi");
  typeInto("Email", "ada@oblee.app");
  typeInto("Date of birth", "1995-04-12");
  typeInto("Password", "PartyTime2026!");
  typeInto("Confirm password", "PartyTime2026!");
}

describe("authentication alerts", () => {
  it("shows a signup failure as a dismissible error alert", async () => {
    register.mockResolvedValueOnce({ status: "error", message: "That email already has an account. Try logging in." });
    render(<RegisterForm next="/" />);
    fillRegistration();

    click(/create account/i);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("That email already has an account. Try logging in.");
    expect(alert).toHaveAttribute("data-tone", "error");
    expect(alert).toHaveAttribute("aria-live", "assertive");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss message" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("brings the alert back for the next failed attempt", async () => {
    register
      .mockResolvedValueOnce({ status: "error", message: "That email already has an account. Try logging in." })
      .mockResolvedValueOnce({ status: "error", message: "That email already has an account. Try logging in." });
    render(<RegisterForm next="/" />);
    fillRegistration();

    click(/create account/i);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss message" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    click(/create account/i);
    expect(await screen.findByRole("alert")).toHaveTextContent("already has an account");
  });

  it("keeps a server password complaint next to the field instead of duplicating it", async () => {
    register.mockResolvedValueOnce({ status: "error", message: "Use a password of at least 8 characters." });
    render(<RegisterForm next="/" />);
    fillRegistration();

    click(/create account/i);

    await waitFor(() => expect(screen.getAllByText("Use a password of at least 8 characters.")).toHaveLength(1));
    expect(document.querySelector(".alert")).toBeNull();
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
  });

  it("keeps a server mismatch complaint on the confirmation field", async () => {
    register.mockResolvedValueOnce({ status: "error", message: "The passwords do not match." });
    render(<RegisterForm next="/" />);
    fillRegistration();

    click(/create account/i);

    await waitFor(() => expect(screen.getAllByText("The passwords do not match.")).toHaveLength(1));
    expect(document.querySelector(".alert")).toBeNull();
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a login failure as an error alert", async () => {
    login.mockResolvedValueOnce({ status: "error", message: "Wrong email or password." });
    render(<LoginForm next="/" />);
    typeInto("Email", "ada@oblee.app");
    typeInto("Password", "PartyTime2026!");

    click(/^log in$/i);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Wrong email or password.");
    expect(alert).toHaveAttribute("data-tone", "error");
  });

  it("confirms a reset email with an informational alert", async () => {
    forgot.mockResolvedValueOnce({
      status: "notice",
      message: "If that email has an Oblee account, a reset link is on its way.",
    });
    render(<ForgotPasswordForm />);
    typeInto("Email", "ada@oblee.app");

    click(/send reset link/i);

    const status = await screen.findByRole("status");
    expect(status).toHaveAttribute("data-tone", "info");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("a reset link is on its way");
  });

  it("confirms a verification email with a success alert", async () => {
    resend.mockResolvedValueOnce({ status: "notice", message: "Verification email sent. Check your inbox." });
    render(<ResendVerificationForm email="ada@oblee.app" />);

    click(/resend verification email/i);

    const status = await screen.findByRole("status");
    expect(status).toHaveAttribute("data-tone", "success");
    expect(status).toHaveTextContent("Verification email sent");
  });

  it("shows an expired reset link as an error alert", async () => {
    reset.mockResolvedValueOnce({ status: "error", message: "Your reset link has expired. Request a new one." });
    render(<ResetPasswordForm />);
    typeInto("New password", "PartyTime2026!");
    typeInto("Confirm new password", "PartyTime2026!");

    click(/save new password/i);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your reset link has expired.");
  });

  it("shows age verification failures as an alert", async () => {
    age.mockResolvedValueOnce({ status: "error", message: "You must be at least 18 years old to use Oblee." });
    render(<AgeVerificationForm next="/" />);
    typeInto("Date of birth", "2012-04-12");

    click(/confirm my age/i);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("You must be at least 18 years old to use Oblee.");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss message" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("leaves the field-level guard in charge before the server is asked", () => {
    render(<RegisterForm next="/" />);
    fillRegistration();
    typeInto("Password", "short");
    typeInto("Confirm password", "short");

    click(/create account/i);

    expect(screen.getAllByText("Add at least 8 characters.")).toHaveLength(1);
    expect(document.querySelector(".alert")).toBeNull();
    expect(register).not.toHaveBeenCalled();
  });
});
