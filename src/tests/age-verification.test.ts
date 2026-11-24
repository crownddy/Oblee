import { describe, expect, it } from "vitest";
import { dateOfBirthSchema } from "@/lib/validation/auth";
import { needsAgeVerification, type AgeStatus } from "@/lib/services/age";

const verified: AgeStatus = { hasDateOfBirth: true, isAdult: true, dateOfBirth: "1990-01-01" };
const legacy: AgeStatus = { hasDateOfBirth: false, isAdult: false, dateOfBirth: null };

describe("needsAgeVerification", () => {
  it("asks an account created before the rule to verify", () => {
    expect(needsAgeVerification(legacy)).toBe(true);
  });

  it("asks an account whose stored date failed the check to verify", () => {
    expect(needsAgeVerification({ hasDateOfBirth: true, isAdult: false, dateOfBirth: "2015-01-01" })).toBe(true);
  });

  it("lets a verified adult continue", () => {
    expect(needsAgeVerification(verified)).toBe(false);
  });

  it("stays out of the way when the status could not be read", () => {
    expect(needsAgeVerification(null)).toBe(false);
  });
});

describe("dateOfBirthSchema", () => {
  it("accepts an adult date", () => {
    expect(dateOfBirthSchema.safeParse({ dateOfBirth: "1990-06-15" }).success).toBe(true);
  });

  it("rejects a missing date", () => {
    const result = dateOfBirthSchema.safeParse({ dateOfBirth: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter your date of birth.");
  });

  it("rejects an impossible date", () => {
    expect(dateOfBirthSchema.safeParse({ dateOfBirth: "1990-02-31" }).success).toBe(false);
  });

  it("rejects anyone under 18", () => {
    const result = dateOfBirthSchema.safeParse({ dateOfBirth: "2015-01-01" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("You must be at least 18 years old to use Oblee.");
  });
});
