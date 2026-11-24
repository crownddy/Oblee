import { DEFAULT_TIMEZONE } from "@/lib/constants";

const LOCALE = "en-GB";

/**
 * Timezone stored on an event, or the Oblee default when it is missing or not a
 * zone the runtime knows. Formatting with an unknown zone throws, so every
 * stored value is checked once, where rows become domain objects.
 */
export function normaliseTimezone(timezone: string | null | undefined): string {
  if (!timezone) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat(LOCALE, { timeZone: timezone }).format(0);
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function money(value: number): string {
  return `₦${Number(value).toLocaleString("en-US")}`;
}

export function formatDateParts(
  iso: string,
  timezone: string = DEFAULT_TIMEZONE,
): { weekday: string; day: string; month: string } {
  const date = new Date(iso);
  const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: timezone }).format(date);
  const day = new Intl.DateTimeFormat(LOCALE, { day: "numeric", timeZone: timezone }).format(date);
  const month = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: timezone }).format(date);
  return { weekday: weekday.toUpperCase(), day, month: month.toUpperCase() };
}

export function formatEventDate(iso: string, timezone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(iso));
}

export function formatEventDateShort(iso: string, timezone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(new Date(iso));
}

export function formatTime(iso: string, timezone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  })
    .format(new Date(iso))
    .replace(/\s/g, " ");
}

/** Calendar date (YYYY-MM-DD) of an instant in the event timezone. */
export function dateKey(iso: string, timezone: string = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));
  return parts;
}

export function todayKey(timezone: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  return dateKey(now.toISOString(), timezone);
}

export function weekdayIndex(iso: string, timezone: string = DEFAULT_TIMEZONE): number {
  const label = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: timezone }).format(new Date(iso));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(label);
}

export function isToday(iso: string, timezone: string = DEFAULT_TIMEZONE, now: Date = new Date()): boolean {
  return dateKey(iso, timezone) === todayKey(timezone, now);
}

/** Prototype weekend rule: Friday, Saturday and Sunday. */
export function isWeekend(iso: string, timezone: string = DEFAULT_TIMEZONE): boolean {
  return [5, 6, 0].includes(weekdayIndex(iso, timezone));
}

export function carouselDateLabel(
  iso: string,
  timezone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): string {
  if (isToday(iso, timezone, now)) return "Tonight";
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(new Date(iso));
}

export function relativeDay(iso: string, timezone: string = DEFAULT_TIMEZONE, now: Date = new Date()): number {
  const target = new Date(`${dateKey(iso, timezone)}T00:00:00Z`).getTime();
  const base = new Date(`${dateKey(now.toISOString(), timezone)}T00:00:00Z`).getTime();
  return Math.round((target - base) / 86_400_000);
}

/** Builds the event start instant from a calendar date, wall-clock time and timezone. */
export function toInstant(date: string, time: string, timezone: string = DEFAULT_TIMEZONE): string {
  // Africa/Lagos has a fixed UTC+01:00 offset (no DST). Other zones fall back to UTC.
  const offsetMinutes = timezone === "Africa/Lagos" ? 60 : 0;
  const utc = Date.parse(`${date}T${time}:00Z`);
  return new Date(utc - offsetMinutes * 60_000).toISOString();
}

export function fromInstant(iso: string, timezone: string = DEFAULT_TIMEZONE): { date: string; time: string } {
  const date = dateKey(iso, timezone);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso));
  return { date, time };
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+/, "");
}

export function contactLink(contact: { kind: string; countryCode: string; value: string }): string {
  const value = contact.value.trim();
  if (contact.kind === "email") return `mailto:${value}`;
  if (contact.kind === "call") return `tel:${contact.countryCode}${digitsOnly(value)}`;
  return `https://wa.me/${contact.countryCode.replace("+", "")}${digitsOnly(value)}`;
}

export function contactText(contact: { kind: string; countryCode: string; value: string }): string {
  if (contact.kind === "email") return contact.value.trim();
  return `${contact.countryCode} ${digitsOnly(contact.value)}`;
}

export function directionsUrl(venue: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue)}`;
}

export function mapEmbedUrl(venue: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(venue)}&output=embed`;
}

export function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}
