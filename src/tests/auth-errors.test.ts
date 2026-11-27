import { describe, expect, it } from "vitest";
import { describeAuthError } from "@/lib/auth/errors";

const PASSWORD_POLICY_MESSAGE = "Passwords need at least 8 characters.";

describe("describeAuthError", () => {
  it("reports a password length Supabase rejects", () => {
    expect(describeAuthError({ message: "Password should be at least 6 characters." }, "signup")).toBe(
      "Passwords need at least 6 characters.",
    );
    expect(describeAuthError({ message: "Password should be at least 12 characters" }, "reset")).toBe(
      "Passwords need at least 12 characters.",
    );
  });

  it("falls back to the app minimum when Supabase states no number", () => {
    expect(describeAuthError({ message: "Password is too short" }, "signup")).toBe(PASSWORD_POLICY_MESSAGE);
  });

  it("asks for a stronger password when Supabase flags one", () => {
    const message = describeAuthError({ message: "Password has been found in a data breach" }, "reset");
    expect(message).toMatch(/too easy to guess/i);
    expect(message).not.toMatch(/breach/i);
  });

  it("keeps account existence vague where it must", () => {
    expect(describeAuthError({ message: "User already registered" }, "signup")).toMatch(/already has an account/i);
    expect(describeAuthError({ message: "Invalid login credentials" }, "login")).toBe("Wrong email or password.");
    expect(describeAuthError({ code: "invalid_credentials" }, "login")).toBe("Wrong email or password.");
  });

  it("points at the confirmation email when that is the blocker", () => {
    expect(describeAuthError({ message: "Email not confirmed" }, "login")).toMatch(/confirm your email/i);
  });

  it("explains an expired reset link", () => {
    expect(describeAuthError({ message: "Invalid or expired token" }, "reset")).toMatch(/reset link has expired/i);
  });

  it("explains rate limiting", () => {
    expect(describeAuthError({ message: "Too many requests" }, "login")).toMatch(/wait a minute/i);
    expect(describeAuthError({ status: 429, message: "" }, "signup")).toMatch(/wait a minute/i);
  });

  it("asks for a password that has not been reused", () => {
    expect(describeAuthError({ message: "New password should be different from the old password" }, "reset")).toMatch(
      /have not used on Oblee before/i,
    );
  });

  it("falls back to a plain message without echoing internals", () => {
    const leaky = "TypeError: fetch failed at /var/task/node_modules/@supabase/gotrue.js:42";
    const message = describeAuthError({ message: leaky }, "signup");

    expect(message).toBe("We could not create your account. Try again.");
    expect(message).not.toContain("supabase");
    expect(message).not.toContain("TypeError");
    expect(describeAuthError({}, "reset")).toBe("We could not update your password. Try again in a moment.");
    expect(describeAuthError({}, "login")).toBe("We could not sign you in. Try again.");
  });
});
