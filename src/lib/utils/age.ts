import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { dateKey } from "@/lib/utils/format";

export const MINIMUM_AGE = 18;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

/** Whole years between the date of birth and the reference date, on the local calendar. */
export function ageOn(
  dateOfBirth: string,
  now: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE,
): number {
  if (!isIsoDate(dateOfBirth)) return Number.NaN;
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map(Number) as [number, number, number];
  const [todayYear, todayMonth, todayDay] = dateKey(now.toISOString(), timezone).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const hadBirthday =
    todayMonth > birthMonth || (todayMonth === birthMonth && todayDay >= birthDay);
  return todayYear - birthYear - (hadBirthday ? 0 : 1);
}

export function isAdult(
  dateOfBirth: string,
  now: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE,
): boolean {
  const age = ageOn(dateOfBirth, now, timezone);
  return Number.isFinite(age) && age >= MINIMUM_AGE;
}

/** Latest date of birth that still qualifies as an adult on the reference date. */
export function latestAdultBirthDate(now: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string {
  const [year, month, day] = dateKey(now.toISOString(), timezone).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const target = new Date(Date.UTC(year - MINIMUM_AGE, month - 1, day));
  return target.toISOString().slice(0, 10);
}
