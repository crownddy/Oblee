import { describe, expect, it } from "vitest";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
  describePasswordProblem,
  passwordMeetsPolicy,
  passwordStrength,
  passwordVariety,
  unmetPasswordRequirements,
} from "@/lib/validation/password";
import { registerSchema, resetPasswordSchema } from "@/lib/validation/auth";

const long = "a".repeat(PASSWORD_MIN_LENGTH);
const tooLong = "a".repeat(PASSWORD_MAX_LENGTH + 1);

describe("password policy", () => {
  it("stays in step with the schemas the server validates with", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_MAX_LENGTH).toBe(200);
    expect(passwordMeetsPolicy(long)).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: long, confirmPassword: long }).success).toBe(true);
    expect(passwordMeetsPolicy("a".repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false);
  });

  it("accepts the shortest and longest allowed passwords", () => {
    expect(passwordMeetsPolicy(long)).toBe(true);
    expect(passwordMeetsPolicy("a".repeat(PASSWORD_MAX_LENGTH))).toBe(true);
    expect(passwordMeetsPolicy(tooLong)).toBe(false);
  });

  it("lists only the requirements the policy actually enforces", () => {
    expect(PASSWORD_REQUIREMENTS.map((requirement) => requirement.id)).toEqual(["min", "max"]);
    expect(PASSWORD_REQUIREMENTS.map((requirement) => requirement.label)).toEqual([
      "At least 8 characters",
      "No more than 200 characters",
    ]);
  });

  it("reports the unmet requirements in checklist order", () => {
    expect(unmetPasswordRequirements("abc").map((requirement) => requirement.id)).toEqual(["min"]);
    expect(unmetPasswordRequirements(tooLong).map((requirement) => requirement.id)).toEqual(["max"]);
    expect(unmetPasswordRequirements(long)).toEqual([]);
  });

  it("counts the character classes present", () => {
    expect(passwordVariety("aaaa")).toBe(1);
    expect(passwordVariety("aA1")).toBe(3);
    expect(passwordVariety("aA1!")).toBe(4);
  });

  it("never calls a password the policy rejects anything but weak", () => {
    for (const value of ["", "short", "a".repeat(7), tooLong]) {
      expect(passwordStrength(value).level).toBe("weak");
      expect(passwordStrength(value).score).toBe(1);
    }
  });

  it("only offers a hint when there is something worth adding", () => {
    expect(passwordStrength("short").hint).toBe("");
    expect(passwordStrength("aaaaaaaa").hint).toMatch(/12 or more characters/);
    expect(passwordStrength("PartyTime2026!").hint).toMatch(/varied mix/);
  });

  it("starts every acceptable password at fair", () => {
    expect(passwordStrength("aaaaaaaa").level).toBe("fair");
    expect(passwordStrength("aaaaaaaa").score).toBe(2);
    expect(passwordStrength("Password1").level).toBe("fair");
  });

  it("rewards length plus variety with strong", () => {
    const strong = passwordStrength("PartyTime2026!");
    expect(strong.level).toBe("strong");
    expect(strong.label).toBe("Strong");
    expect(strong.score).toBe(3);
  });

  it("does not call a long single-class password strong", () => {
    expect(passwordStrength("aaaaaaaaaaaaaa").level).toBe("fair");
  });

  it("explains exactly what to fix", () => {
    expect(describePasswordProblem("abc")).toBe("Add at least 8 characters.");
    expect(describePasswordProblem(tooLong)).toBe("Keep it to 200 characters or fewer.");
    expect(describePasswordProblem(long, "different")).toBe("The passwords do not match.");
    expect(describePasswordProblem(long, long)).toBeNull();
    expect(describePasswordProblem(long)).toBeNull();
  });

  it("keeps the schema messages aligned with the shared constants", () => {
    const result = registerSchema.safeParse({
      fullName: "Ada Obi",
      email: "ada@oblee.app",
      password: "short",
      confirmPassword: "short",
      dateOfBirth: "1995-04-12",
      role: "attendee",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Use a password of at least 8 characters.");
  });
});
