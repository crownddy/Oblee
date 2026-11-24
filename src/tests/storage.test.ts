import { describe, expect, it } from "vitest";
import { eventImagePath, eventImageSource, isOwnedEventImagePath } from "@/lib/utils/images";
import { eventInputSchema } from "@/lib/validation/event";

const ORGANISER_ID = "55555555-5555-4555-8555-555555555555";
const OTHER_ID = "66666666-6666-4666-8666-666666666666";
const PATH = `${ORGANISER_ID}/0f8fad5b-d9cb-469f-a165-70867728950e.jpg`;

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

describe("eventImagePath", () => {
  it("accepts an object path inside the bucket", () => {
    expect(eventImagePath(PATH)).toBe(PATH);
  });

  it("turns a legacy public URL back into an object path", () => {
    const legacy = `https://project.supabase.co/storage/v1/object/public/event-images/${PATH}`;
    expect(eventImagePath(legacy)).toBe(PATH);
  });

  it("ignores external artwork links", () => {
    expect(eventImagePath("https://cdn.example.com/cover.jpg")).toBeNull();
  });

  it("rejects lookalike paths and empty values", () => {
    expect(eventImagePath(null)).toBeNull();
    expect(eventImagePath("")).toBeNull();
    expect(eventImagePath("not-a-path.jpg")).toBeNull();
    expect(eventImagePath(`${ORGANISER_ID}/../secret.jpg`)).toBeNull();
    expect(eventImagePath(`${ORGANISER_ID}/nested/secret.jpg`)).toBeNull();
  });
});

describe("isOwnedEventImagePath", () => {
  it("accepts a file in the caller's own folder", () => {
    expect(isOwnedEventImagePath(PATH, ORGANISER_ID)).toBe(true);
  });

  it("rejects another account's folder", () => {
    expect(isOwnedEventImagePath(PATH, OTHER_ID)).toBe(false);
    expect(isOwnedEventImagePath(PATH, null)).toBe(false);
  });
});

describe("eventImageSource", () => {
  it("renders the signed URL for a bucket file", () => {
    expect(eventImageSource(PATH, "https://signed.example.com/a.jpg")).toBe("https://signed.example.com/a.jpg");
  });

  it("falls back to a gradient when a private file cannot be signed", () => {
    expect(eventImageSource(PATH, null)).toBeNull();
  });

  it("passes external links straight through", () => {
    expect(eventImageSource("https://cdn.example.com/cover.jpg", null)).toBe("https://cdn.example.com/cover.jpg");
  });
});

describe("eventInputSchema covers", () => {
  it("accepts an uploaded path", () => {
    expect(eventInputSchema.safeParse({ ...validEvent, heroImageUrl: PATH }).success).toBe(true);
  });

  it("accepts an https artwork link", () => {
    expect(eventInputSchema.safeParse({ ...validEvent, heroImageUrl: "https://cdn.example.com/a.jpg" }).success).toBe(
      true,
    );
  });

  it("rejects an insecure or malformed image value", () => {
    expect(eventInputSchema.safeParse({ ...validEvent, heroImageUrl: "http://cdn.example.com/a.jpg" }).success).toBe(
      false,
    );
    expect(eventInputSchema.safeParse({ ...validEvent, heroImageUrl: "cover.jpg" }).success).toBe(false);
  });
});
