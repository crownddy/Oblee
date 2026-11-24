import { z } from "zod";
import {
  CATEGORIES,
  CONTACT_KINDS,
  IDENTITY_OPTIONS,
  MAX_DESCRIPTION,
  MAX_TAGS,
  SECURITY_OPTIONS,
  TABLE_COUNTS,
  TABLE_SEATS,
  TICKET_MODES,
  isEventCategory,
} from "@/lib/constants";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour.");

export const contactSchema = z
  .object({
    kind: z.enum(CONTACT_KINDS),
    caption: z.string().trim().min(2, "Add a button caption.").max(60),
    countryCode: z.string().trim().regex(/^\+\d{1,4}$/, "Choose a country code."),
    value: z.string().trim().min(1, "Add the contact detail."),
  })
  .superRefine((contact, ctx) => {
    if (contact.kind === "email") {
      if (!/^\S+@\S+\.\S+$/.test(contact.value)) {
        ctx.addIssue({ code: "custom", path: ["value"], message: "Add a valid email address." });
      }
      return;
    }
    const digits = contact.value.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Add a valid phone number." });
    }
  });

export const ticketTierSchema = z.object({
  name: z.enum(TICKET_MODES),
  price: z.number().int("Use whole naira.").min(1, "Add a price.").max(100_000_000),
});

export const eventTableSchema = z.object({
  seats: z.number().int().min(1).max(100),
  quantity: z.number().int().min(1).max(500),
});

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(3, "Give your event a name.").max(120, "Keep the name under 120 characters."),
    category: z.string().refine(isEventCategory, "Choose a category."),
    visibility: z.enum(["public", "private"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time."),
    venue: z.string().trim().min(3, "Add the venue.").max(160),
    city: z.string().trim().max(80).optional(),
    description: z
      .string()
      .trim()
      .min(10, "Add a short description.")
      .max(MAX_DESCRIPTION, `Keep the description under ${MAX_DESCRIPTION} characters.`),
    securityNote: z.enum(SECURITY_OPTIONS),
    identityNote: z.enum(IDENTITY_OPTIONS),
    tags: z
      .array(z.string().trim().min(1).max(24))
      .max(MAX_TAGS, `Use up to ${MAX_TAGS} tags.`)
      .default([]),
    heroImageUrl: z.string().trim().url("The image link is not valid.").max(600).nullable(),
    colorFrom: hex,
    colorTo: hex,
    isFree: z.boolean(),
    tickets: z.array(ticketTierSchema).max(3).default([]),
    tables: z.array(eventTableSchema).max(10).default([]),
    contacts: z.array(contactSchema).min(1, "Add at least one RSVP contact.").max(4),
    agreeTerms: z.literal(true, "Please accept the Terms and Conditions."),
  })
  .superRefine((value, ctx) => {
    if (!value.isFree && value.tickets.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["tickets"],
        message: "Pick at least one reservation mode.",
      });
    }
    if (value.isFree && value.tickets.length > 0) {
      ctx.addIssue({ code: "custom", path: ["tickets"], message: "Free events have no ticket tiers." });
    }
    const names = new Set<string>();
    value.tickets.forEach((ticket, index) => {
      if (names.has(ticket.name)) {
        ctx.addIssue({ code: "custom", path: ["tickets", index, "name"], message: "Each mode can only be used once." });
      }
      names.add(ticket.name);
    });
    const categories = new Set(CATEGORIES.map((category) => category.value));
    if (!categories.has(value.category as (typeof CATEGORIES)[number]["value"])) {
      ctx.addIssue({ code: "custom", path: ["category"], message: "Choose a category." });
    }
  });

export type ContactInput = z.infer<typeof contactSchema>;
export type EventInput = z.infer<typeof eventInputSchema>;

export const TABLE_SEAT_VALUES = TABLE_SEATS;
export const TABLE_COUNT_VALUES = TABLE_COUNTS;
