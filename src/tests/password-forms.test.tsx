import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RegisterForm, ResetPasswordForm } from "@/components/auth/AuthForms";
import { registerAction as registerAction_, resetPasswordAction as resetPasswordAction_ } from "@/lib/actions/auth";

vi.mock("@/lib/actions/auth", () => ({
  registerAction: vi.fn(async () => ({ status: "idle" as const })),
  resetPasswordAction: vi.fn(async () => ({ status: "idle" as const })),
  loginAction: vi.fn(async () => ({ status: "idle" as const })),
  logoutAction: vi.fn(async () => undefined),
  forgotPasswordAction: vi.fn(async () => ({ status: "idle" as const })),
  resendVerificationAction: vi.fn(async () => ({ status: "idle" as const })),
}));

const registerAction = vi.mocked(registerAction_);
const resetPasswordAction = vi.mocked(resetPasswordAction_);

beforeEach(() => {
  registerAction.mockClear();
  resetPasswordAction.mockClear();
});

afterEach(() => {
  cleanup();
});

const password = () => screen.getByLabelText("Password") as HTMLInputElement;
const confirm = () => screen.getByLabelText("Confirm password") as HTMLInputElement;
const newPassword = () => screen.getByLabelText("New password") as HTMLInputElement;
const confirmNew = () => screen.getByLabelText("Confirm new password") as HTMLInputElement;

const typeInto = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });

/** Field errors are alerts too, so match on the wording rather than the first one. */
const alertWith = (text: RegExp) =>
  screen.queryAllByRole("alert").find((element) => element.textContent && text.test(element.textContent));

function fillRegistration() {
  typeInto(screen.getByLabelText("Full name"), "Ada Obi");
  typeInto(screen.getByLabelText("Email"), "ada@oblee.app");
  typeInto(screen.getByLabelText("Date of birth"), "1995-04-12");
}

describe("registration password validation", () => {
  it("shows the requirements and the strength meter while typing", () => {
    render(<RegisterForm next="/" />);

    expect(screen.getByRole("list", { name: "Password requirements" })).toBeInTheDocument();
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();

    typeInto(password(), "Party");
    expect(screen.getByRole("status")).toHaveTextContent("Weak");

    typeInto(password(), "Party123");
    expect(screen.getByRole("status")).toHaveTextContent("Fair");
  });

  it("blocks submission while the password is too short and says what to fix", async () => {
    render(<RegisterForm next="/" />);
    fillRegistration();
    typeInto(password(), "Party1");
    typeInto(confirm(), "Party1");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(alertWith(/Add at least 8 characters\./)).toBeTruthy());
    expect(registerAction).not.toHaveBeenCalled();
    expect(password()).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(password()).toHaveFocus());
  });

  it("blocks submission when the passwords do not match", async () => {
    render(<RegisterForm next="/" />);
    fillRegistration();
    typeInto(password(), "PartyTime2026!");
    typeInto(confirm(), "PartyTime2026");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(alertWith(/The passwords do not match\./)).toBeTruthy());
    expect(registerAction).not.toHaveBeenCalled();
    await waitFor(() => expect(confirm()).toHaveFocus());
  });

  it("warns about a mismatch as soon as the confirmation is typed", () => {
    render(<RegisterForm next="/" />);
    typeInto(password(), "PartyTime2026!");
    typeInto(confirm(), "PartyTime2026");

    expect(alertWith(/The passwords do not match\./)).toBeTruthy();
    expect(confirm()).toHaveAttribute("aria-invalid", "true");
  });

  it("clears the warning once the passwords match", () => {
    render(<RegisterForm next="/" />);
    typeInto(password(), "PartyTime2026!");
    typeInto(confirm(), "PartyTime2026");
    typeInto(confirm(), "PartyTime2026!");

    expect(alertWith(/The passwords do not match\./)).toBeUndefined();
    expect(confirm()).not.toHaveAttribute("aria-invalid");
  });

  it("submits a valid password pair to the server action", async () => {
    render(<RegisterForm next="/" />);
    fillRegistration();
    typeInto(password(), "PartyTime2026!");
    typeInto(confirm(), "PartyTime2026!");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(registerAction).toHaveBeenCalledTimes(1));
    const formData = registerAction.mock.calls[0]?.[1] as FormData;
    expect(formData.get("password")).toBe("PartyTime2026!");
    expect(formData.get("confirmPassword")).toBe("PartyTime2026!");
  });
});

describe("reset password validation", () => {
  it("shows the requirements and strength meter on the reset form", () => {
    render(<ResetPasswordForm />);

    expect(screen.getByRole("list", { name: "Password requirements" })).toBeInTheDocument();
    typeInto(newPassword(), "PartyTime2026!");
    expect(screen.getByRole("status")).toHaveTextContent("Strong");
  });

  it("blocks submission while the new password is too short", async () => {
    render(<ResetPasswordForm />);
    typeInto(newPassword(), "short");
    typeInto(confirmNew(), "short");

    fireEvent.click(screen.getByRole("button", { name: /save new password/i }));

    await waitFor(() => expect(alertWith(/Add at least 8 characters\./)).toBeTruthy());
    expect(resetPasswordAction).not.toHaveBeenCalled();
  });

  it("blocks submission when the confirmation differs", async () => {
    render(<ResetPasswordForm />);
    typeInto(newPassword(), "PartyTime2026!");
    typeInto(confirmNew(), "PartyTime2025!");

    fireEvent.click(screen.getByRole("button", { name: /save new password/i }));

    await waitFor(() => expect(alertWith(/The passwords do not match\./)).toBeTruthy());
    expect(resetPasswordAction).not.toHaveBeenCalled();
  });

  it("submits a valid new password to the server action", async () => {
    render(<ResetPasswordForm />);
    typeInto(newPassword(), "PartyTime2026!");
    typeInto(confirmNew(), "PartyTime2026!");

    fireEvent.click(screen.getByRole("button", { name: /save new password/i }));

    await waitFor(() => expect(resetPasswordAction).toHaveBeenCalledTimes(1));
    const formData = resetPasswordAction.mock.calls[0]?.[1] as FormData;
    expect(formData.get("password")).toBe("PartyTime2026!");
  });

  it("lets the password be revealed on the reset form", () => {
    render(<ResetPasswordForm />);
    fireEvent.click(screen.getByRole("button", { name: "Show new password" }));
    expect(newPassword()).toHaveAttribute("type", "text");
  });
});
