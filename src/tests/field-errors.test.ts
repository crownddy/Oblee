import { describe, expect, it } from "vitest";
import { routeAuthMessage } from "@/lib/auth/fieldErrors";

describe("routeAuthMessage", () => {
  it("ignores empty messages", () => {
    expect(routeAuthMessage(undefined)).toBeNull();
    expect(routeAuthMessage(null)).toBeNull();
    expect(routeAuthMessage("   ")).toBeNull();
  });

  it("sends password strength complaints to the password field", () => {
    for (const message of [
      "Use a password of at least 8 characters.",
      "Passwords need at least 12 characters.",
      "That password is too easy to guess. Try a longer one with a mix of letters, numbers and symbols.",
      "Choose a password you have not used on Oblee before.",
    ]) {
      expect(routeAuthMessage(message)).toEqual({ field: "password", message });
    }
  });

  it("sends mismatch complaints to the confirmation field", () => {
    expect(routeAuthMessage("The passwords do not match.")).toEqual({
      field: "confirmPassword",
      message: "The passwords do not match.",
    });
  });

  it("keeps account and session problems at form level", () => {
    for (const message of [
      "That email already has an account. Try logging in.",
      "Wrong email or password.",
      "Your reset link has expired. Request a new one.",
      "Too many attempts. Wait a minute and try again.",
      "We could not create your account. Try again.",
    ]) {
      expect(routeAuthMessage(message)).toEqual({ field: null, message });
    }
  });
});
