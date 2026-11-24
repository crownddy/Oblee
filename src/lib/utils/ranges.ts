import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { dateKey, toInstant, weekdayIndex } from "@/lib/utils/format";

export interface InstantRange {
  start: string;
  endExclusive: string;
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function dayRange(date: string, timezone: string = DEFAULT_TIMEZONE): InstantRange {
  return {
    start: toInstant(date, "00:00", timezone),
    endExclusive: toInstant(addDays(date, 1), "00:00", timezone),
  };
}

/** Friday 00:00 to Monday 00:00 of the week containing `now` (prototype rule). */
export function weekendRange(now: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): InstantRange {
  const today = dateKey(now.toISOString(), timezone);
  const day = weekdayIndex(now.toISOString(), timezone);
  const offset = day === 0 ? -2 : 5 - day;
  const friday = addDays(today, offset);
  return {
    start: toInstant(friday, "00:00", timezone),
    endExclusive: toInstant(addDays(friday, 3), "00:00", timezone),
  };
}

export function resolveDateFilter(
  category: string | undefined,
  date: string | undefined,
  now: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE,
): InstantRange | null {
  if (date) return dayRange(date, timezone);
  if (category === "Today") return dayRange(dateKey(now.toISOString(), timezone), timezone);
  if (category === "Weekend") return weekendRange(now, timezone);
  return null;
}
