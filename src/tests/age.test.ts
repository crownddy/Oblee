import { describe, expect, it } from "vitest";
import { ageOn, isAdult, isIsoDate, latestAdultBirthDate } from "@/lib/utils/age";
import { registerSchema } from "@/lib/validation/auth";

const NOW = new Date("2026-11-24T12:00:00Z");

function registration(dateOfBirth: string) {
  return {
    fullName: "Ada Obi",
    email: "ada@oblee.app",
    password: "secret123",
    confirmPassword: "secret123",
    dateOfBirth,
    role: "attendee" as const,
  };
}

describe("isIsoDate", () => {
  it("accepts real calendar dates", () => {
    expect(isIsoDate("1996-02-29")).toBe(true);
    expect(isIsoDate("2026-11-24")).toBe(true);
  });

  it("rejects malformed and impossible dates", () => {
    expect(isIsoDate("24/11/1996")).toBe(false);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("1996-13-01")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("ageOn", () => {
  it("counts whole years before the birthday", () => {
    expect(ageOn("2008-11-25", NOW)).toBe(17);
  });

  it("counts the birthday itself as a full year", () => {
    expect(ageOn("2008-11-24", NOW)).toBe(18);
  });

  it("returns NaN for an invalid date", () => {
    expect(Number.isNaN(ageOn("not-a-date", NOW))).toBe(true);
  });
});

describe("isAdult", () => {
  it("rejects someone who turns 18 tomorrow", () => {
    expect(isAdult("2008-11-25", NOW)).toBe(false);
  });

  it("accepts someone who turns 18 today", () => {
    expect(isAdult("2008-11-24", NOW)).toBe(true);
  });

  it("accepts adults with older birthdays", () => {
    expect(isAdult("1990-01-01", NOW)).toBe(true);
  });

  it("rejects a leap-day birthday that has not come around yet", () => {
    expect(isAdult("2008-02-29", NOW)).toBe(true);
    expect(isAdult("2008-02-29", new Date("2026-02-27T12:00:00Z"))).toBe(false);
  });

  it("rejects a future date of birth", () => {
    expect(isAdult("2026-11-25", NOW)).toBe(false);
  });
});

describe("latestAdultBirthDate", () => {
  it("returns the newest date of birth that is still 18+", () => {
    expect(latestAdultBirthDate(NOW)).toBe("2008-11-24");
  });
});

describe("registerSchema age enforcement", () => {
  it("rejects an under-18 registration", () => {
    const result = registerSchema.safeParse(registration("2012-05-04"));
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => /at least 18/.test(issue.message))).toBe(true);
  });

  it("rejects an 18th birthday that has not arrived yet", () => {
    const tomorrow = new Date(Date.parse(`${latestAdultBirthDate()}T00:00:00Z`) + 86_400_000);
    expect(registerSchema.safeParse(registration(tomorrow.toISOString().slice(0, 10))).success).toBe(false);
  });

  it("accepts an adult registration", () => {
    const result = registerSchema.safeParse(registration("1996-02-29"));
    expect(result.success).toBe(true);
    expect(result.data?.dateOfBirth).toBe("1996-02-29");
  });

  it("accepts someone who turns 18 today", () => {
    expect(registerSchema.safeParse(registration(latestAdultBirthDate())).success).toBe(true);
  });

  it("requires a date of birth", () => {
    const result = registerSchema.safeParse(registration(""));
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message === "Enter your date of birth.")).toBe(true);
  });

  it("rejects an impossible date", () => {
    const result = registerSchema.safeParse(registration("1996-02-30"));
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message === "Enter a valid date of birth.")).toBe(true);
  });
});
