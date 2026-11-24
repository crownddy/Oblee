import { describe, expect, it } from "vitest";
import { contactSchema, eventInputSchema } from "@/lib/validation/event";
import { loginSchema, registerSchema, reportEventSchema } from "@/lib/validation/auth";

const validEvent = {
  title: "Detty December Rooftop",
  category: "concert",
  visibility: "public" as const,
  date: "2026-12-12",
  time: "21:00",
  venue: "Victoria Island",
  city: "Lagos",
  description: "Live afrobeats performances with a skyline view.",
  securityNote: "On-site security",
  identityNote: "ID required",
  tags: ["afrobeats"],
  heroImageUrl: null,
  colorFrom: "#6a47f5",
  colorTo: "#c026d3",
  isFree: true,
  tickets: [],
  tables: [],
  contacts: [{ kind: "whatsapp" as const, caption: "Chat on WhatsApp", countryCode: "+234", value: "8012345678" }],
  agreeTerms: true as const,
};

describe("eventInputSchema", () => {
  it("accepts a complete free event", () => {
    const result = eventInputSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("rejects a title that is too short", () => {
    const result = eventInputSchema.safeParse({ ...validEvent, title: "Go" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Give your event a name.");
  });

  it("rejects an unknown category", () => {
    const result = eventInputSchema.safeParse({ ...validEvent, category: "rave" });
    expect(result.success).toBe(false);
  });

  it("requires at least one RSVP contact", () => {
    const result = eventInputSchema.safeParse({ ...validEvent, contacts: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message === "Add at least one RSVP contact.")).toBe(true);
  });

  it("requires ticket tiers for paid events", () => {
    const result = eventInputSchema.safeParse({ ...validEvent, isFree: false, tickets: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message === "Pick at least one reservation mode.")).toBe(true);
  });

  it("rejects ticket tiers on free events", () => {
    const result = eventInputSchema.safeParse({
      ...validEvent,
      tickets: [{ name: "Regular", price: 20000 }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message === "Free events have no ticket tiers.")).toBe(true);
  });

  it("accepts a paid event with unique tiers", () => {
    const result = eventInputSchema.safeParse({
      ...validEvent,
      isFree: false,
      tickets: [
        { name: "Regular", price: 20000 },
        { name: "VIP", price: 45000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects duplicate ticket tiers", () => {
    const result = eventInputSchema.safeParse({
      ...validEvent,
      isFree: false,
      tickets: [
        { name: "VIP", price: 20000 },
        { name: "VIP", price: 45000 },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message === "Each mode can only be used once.")).toBe(true);
  });

  it("rejects fractional naira prices", () => {
    const result = eventInputSchema.safeParse({
      ...validEvent,
      isFree: false,
      tickets: [{ name: "Regular", price: 20000.5 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects terms that were not accepted", () => {
    const result = eventInputSchema.safeParse({ ...validEvent, agreeTerms: false });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid cover colour", () => {
    const result = eventInputSchema.safeParse({ ...validEvent, colorFrom: "purple" });
    expect(result.success).toBe(false);
  });
});

describe("contactSchema", () => {
  it("accepts a phone contact with a country code", () => {
    expect(contactSchema.safeParse(validEvent.contacts[0]).success).toBe(true);
  });

  it("rejects a phone number that is too short", () => {
    const result = contactSchema.safeParse({ ...validEvent.contacts[0], value: "123" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Add a valid phone number.");
  });

  it("validates email contacts as addresses", () => {
    const base = { kind: "email" as const, caption: "Email the host", countryCode: "+234", value: "hello@oblee.app" };
    expect(contactSchema.safeParse(base).success).toBe(true);
    expect(contactSchema.safeParse({ ...base, value: "not-an-email" }).success).toBe(false);
  });

  it("rejects a caption that is too short", () => {
    const result = contactSchema.safeParse({ ...validEvent.contacts[0], caption: "x" });
    expect(result.success).toBe(false);
  });
});

describe("auth schemas", () => {
  it("normalises the email address on login", () => {
    const result = loginSchema.safeParse({ email: "  Ada@Oblee.App ", password: "secret123" });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("ada@oblee.app");
  });

  it("rejects an email without a domain", () => {
    expect(loginSchema.safeParse({ email: "ada@", password: "secret123" }).success).toBe(false);
  });

  it("rejects a short password on registration", () => {
    const result = registerSchema.safeParse({
      fullName: "Ada Obi",
      email: "ada@oblee.app",
      password: "short",
      confirmPassword: "short",
      role: "attendee",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      fullName: "Ada Obi",
      email: "ada@oblee.app",
      password: "secret123",
      confirmPassword: "secret124",
      role: "attendee",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message === "The passwords do not match.")).toBe(true);
  });

  it("only allows attendee or organiser roles at sign-up", () => {
    const result = registerSchema.safeParse({
      fullName: "Ada Obi",
      email: "ada@oblee.app",
      password: "secret123",
      confirmPassword: "secret123",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });

  it("requires a reason when reporting an event", () => {
    expect(reportEventSchema.safeParse({ reason: "", details: "" }).success).toBe(false);
    expect(reportEventSchema.safeParse({ reason: "Spam", details: "" }).success).toBe(true);
  });
});
