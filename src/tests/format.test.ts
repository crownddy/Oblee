import { describe, expect, it } from "vitest";
import {
  carouselDateLabel,
  contactLink,
  contactText,
  dateKey,
  directionsUrl,
  fromInstant,
  isWeekend,
  money,
  toInstant,
} from "@/lib/utils/format";
import { dayRange, resolveDateFilter, weekendRange } from "@/lib/utils/ranges";

const LAGOS = "Africa/Lagos";

describe("instant helpers", () => {
  it("converts Lagos wall-clock time to UTC", () => {
    expect(toInstant("2026-11-27", "19:00", LAGOS)).toBe("2026-11-27T18:00:00.000Z");
  });

  it("round-trips a date and time", () => {
    const iso = toInstant("2026-12-31", "23:30", LAGOS);
    expect(fromInstant(iso, LAGOS)).toEqual({ date: "2026-12-31", time: "23:30" });
  });

  it("keeps the local calendar day near midnight", () => {
    const iso = toInstant("2026-01-01", "00:30", LAGOS);
    expect(dateKey(iso, LAGOS)).toBe("2026-01-01");
  });
});

describe("labels", () => {
  it("formats money with the naira symbol", () => {
    expect(money(45000)).toBe("₦45,000");
  });

  it("marks today as Tonight in the carousel", () => {
    const now = new Date("2026-11-24T12:00:00Z");
    const today = toInstant("2026-11-24", "21:00", LAGOS);
    expect(carouselDateLabel(today, LAGOS, now)).toBe("Tonight");
  });

  it("uses the weekday for other days in the carousel", () => {
    const now = new Date("2026-11-24T12:00:00Z");
    const later = toInstant("2026-11-27", "21:00", LAGOS);
    expect(carouselDateLabel(later, LAGOS, now)).toBe("Fri 27 Nov");
  });

  it("treats Friday to Sunday as the weekend", () => {
    expect(isWeekend(toInstant("2026-11-27", "12:00", LAGOS), LAGOS)).toBe(true);
    expect(isWeekend(toInstant("2026-11-28", "12:00", LAGOS), LAGOS)).toBe(true);
    expect(isWeekend(toInstant("2026-11-29", "12:00", LAGOS), LAGOS)).toBe(true);
    expect(isWeekend(toInstant("2026-11-25", "12:00", LAGOS), LAGOS)).toBe(false);
  });
});

describe("contact helpers", () => {
  const phone = { kind: "whatsapp", countryCode: "+234", value: "0801 234 5678" };
  const email = { kind: "email", countryCode: "+234", value: "hello@oblee.app" };

  it("builds a WhatsApp link with digits only", () => {
    expect(contactLink(phone)).toBe("https://wa.me/2348012345678");
  });

  it("builds tel and mailto links", () => {
    expect(contactLink({ ...phone, kind: "call" })).toBe("tel:+2348012345678");
    expect(contactLink(email)).toBe("mailto:hello@oblee.app");
  });

  it("renders readable contact text", () => {
    expect(contactText(phone)).toBe("+234 8012345678");
    expect(contactText(email)).toBe("hello@oblee.app");
  });

  it("encodes the destination for map directions", () => {
    expect(directionsUrl("Lekki, Lagos")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Lekki%2C%20Lagos",
    );
  });
});

describe("date filters", () => {
  it("spans a single local day", () => {
    const range = dayRange("2026-11-27", LAGOS);
    expect(range.start).toBe("2026-11-26T23:00:00.000Z");
    expect(range.endExclusive).toBe("2026-11-27T23:00:00.000Z");
  });

  it("covers Friday to Sunday for a Wednesday reference date", () => {
    const range = weekendRange(new Date("2026-11-25T12:00:00Z"), LAGOS);
    expect(dateKey(range.start, LAGOS)).toBe("2026-11-27");
    expect(dateKey(new Date(Date.parse(range.endExclusive) - 1).toISOString(), LAGOS)).toBe("2026-11-29");
  });

  it("resolves Today and Weekend shortcuts", () => {
    const now = new Date("2026-11-25T12:00:00Z");
    expect(resolveDateFilter("Today", undefined, now, LAGOS)).toEqual(dayRange("2026-11-25", LAGOS));
    expect(resolveDateFilter("Weekend", undefined, now, LAGOS)).toEqual(weekendRange(now, LAGOS));
    expect(resolveDateFilter("Music", undefined, now, LAGOS)).toBeNull();
  });

  it("prefers an explicit date over the category shortcut", () => {
    const now = new Date("2026-11-25T12:00:00Z");
    expect(resolveDateFilter("Today", "2026-12-01", now, LAGOS)).toEqual(dayRange("2026-12-01", LAGOS));
  });
});
