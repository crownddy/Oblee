import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RegisterForm, ResetPasswordForm } from "@/components/auth/AuthForms";
import { PASSWORD_MAX_LENGTH } from "@/lib/validation/password";
import { registerAction, resetPasswordAction } from "@/lib/actions/auth";

vi.mock("@/lib/actions/auth", () => ({
  registerAction: vi.fn(async () => ({ status: "idle" as const })),
  resetPasswordAction: vi.fn(async () => ({ status: "idle" as const })),
  loginAction: vi.fn(async () => ({ status: "idle" as const })),
  logoutAction: vi.fn(async () => undefined),
  forgotPasswordAction: vi.fn(async () => ({ status: "idle" as const })),
  resendVerificationAction: vi.fn(async () => ({ status: "idle" as const })),
}));

const reset = vi.mocked(resetPasswordAction);
const register = vi.mocked(registerAction);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

const newPassword = () => screen.getByLabelText("New password") as HTMLInputElement;
const confirmNew = () => screen.getByLabelText("Confirm new password") as HTMLInputElement;
const typeInto = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: /save new password/i }));

describe("reset password uses the signup password experience", () => {
  it("offers the reveal toggle on both fields", () => {
    render(<ResetPasswordForm />);

    fireEvent.click(screen.getByRole("button", { name: "Show new password" }));
    expect(newPassword()).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Show confirm new password" }));
    expect(confirmNew()).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Hide new password" }));
    expect(newPassword()).toHaveAttribute("type", "password");
  });

  it("shows the same live checklist and strength meter as signup", () => {
    const resetView = render(<ResetPasswordForm />);
    const resetList = screen.getByRole("list", { name: "Password requirements" });
    const resetLabels = Array.from(resetList.querySelectorAll("li")).map((item) => item.textContent?.replace(/Met: |Not met: |✓/g, "").trim());
    resetView.unmount();

    render(<RegisterForm next="/" />);
    const registerList = screen.getByRole("list", { name: "Password requirements" });
    const registerLabels = Array.from(registerList.querySelectorAll("li")).map((item) =>
      item.textContent?.replace(/Met: |Not met: |✓/g, "").trim(),
    );

    expect(resetLabels).toEqual(registerLabels);
    expect(resetLabels).toEqual(["At least 8 characters", "No more than 200 characters"]);
  });

  it("updates the meter as the password improves", () => {
    render(<ResetPasswordForm />);

    typeInto(newPassword(), "Party");
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("status")).toHaveTextContent("Weak");

    typeInto(newPassword(), "Party123");
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByRole("status")).toHaveTextContent("Fair");

    typeInto(newPassword(), "PartyTime2026!");
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByRole("status")).toHaveTextContent("Strong");
  });

  it("keeps the 8 to 200 character policy", async () => {
    render(<ResetPasswordForm />);

    typeInto(newPassword(), "short");
    typeInto(confirmNew(), "short");
    submit();

    expect(await screen.findByText("Add at least 8 characters.")).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();

    const tooLong = "a".repeat(PASSWORD_MAX_LENGTH + 1);
    typeInto(newPassword(), tooLong);
    typeInto(confirmNew(), tooLong);
    submit();

    expect(await screen.findByText(`Keep it to ${PASSWORD_MAX_LENGTH} characters or fewer.`)).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });

  it("warns about a mismatch as soon as the confirmation is typed", () => {
    render(<ResetPasswordForm />);

    typeInto(newPassword(), "PartyTime2026!");
    typeInto(confirmNew(), "PartyTime2025!");

    expect(screen.getByText("The passwords do not match.")).toBeInTheDocument();
    expect(confirmNew()).toHaveAttribute("aria-invalid", "true");
  });

  it("blocks submission and focuses the field that needs fixing", async () => {
    render(<ResetPasswordForm />);

    typeInto(newPassword(), "PartyTime2026!");
    typeInto(confirmNew(), "PartyTime2025!");
    submit();

    expect(reset).not.toHaveBeenCalled();
    await waitFor(() => expect(confirmNew()).toHaveFocus());

    typeInto(confirmNew(), "PartyTime2026!");
    typeInto(newPassword(), "short");
    submit();

    expect(reset).not.toHaveBeenCalled();
    await waitFor(() => expect(newPassword()).toHaveFocus());
  });

  it("sends a valid pair to the server action", async () => {
    render(<ResetPasswordForm />);

    typeInto(newPassword(), "PartyTime2026!");
    typeInto(confirmNew(), "PartyTime2026!");
    submit();

    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
    const formData = reset.mock.calls[0]?.[1] as FormData;
    expect(formData.get("password")).toBe("PartyTime2026!");
    expect(formData.get("confirmPassword")).toBe("PartyTime2026!");
  });

  it("keeps a server password complaint on the field, not in an alert", async () => {
    reset.mockResolvedValueOnce({ status: "error", message: "Use a password of at least 8 characters." });
    render(<ResetPasswordForm />);

    typeInto(newPassword(), "PartyTime2026!");
    typeInto(confirmNew(), "PartyTime2026!");
    submit();

    await waitFor(() => expect(screen.getAllByText("Use a password of at least 8 characters.")).toHaveLength(1));
    expect(document.querySelector(".alert")).toBeNull();
  });

  it("shows an expired link as a dismissible alert", async () => {
    reset.mockResolvedValueOnce({ status: "error", message: "Your reset link has expired. Request a new one." });
    render(<ResetPasswordForm />);

    typeInto(newPassword(), "PartyTime2026!");
    typeInto(confirmNew(), "PartyTime2026!");
    submit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("data-tone", "error");
    expect(alert).toHaveTextContent("Your reset link has expired.");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss message" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a success notice from the action as a status alert", async () => {
    reset.mockResolvedValueOnce({ status: "notice", message: "Password updated. Log in with your new password." });
    render(<ResetPasswordForm />);

    typeInto(newPassword(), "PartyTime2026!");
    typeInto(confirmNew(), "PartyTime2026!");
    submit();

    await waitFor(() => expect(document.querySelector(".alert")).toHaveAttribute("data-tone", "success"));
    expect(document.querySelector(".alert")).toHaveTextContent("Password updated.");
    expect(document.querySelector(".alert")).toHaveAttribute("role", "status");
  });

  it("matches the signup guard behaviour", async () => {
    render(<RegisterForm next="/" />);

    typeInto(screen.getByLabelText("Full name"), "Ada Obi");
    typeInto(screen.getByLabelText("Email"), "ada@oblee.app");
    typeInto(screen.getByLabelText("Date of birth"), "1995-04-12");
    typeInto(screen.getByLabelText("Password"), "short");
    typeInto(screen.getByLabelText("Confirm password"), "short");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(register).not.toHaveBeenCalled();
    expect(await screen.findByText("Add at least 8 characters.")).toBeInTheDocument();
  });
});
