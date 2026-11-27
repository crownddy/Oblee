import { DEFAULT_TIMEZONE, PAGE_SIZE, categoryLabel, type EventStatus } from "@/lib/constants";
import type { EventSummary, EventDetail } from "@/lib/types/domain";
import { dateKey, isToday, isWeekend, money } from "@/lib/utils/format";

export interface DiscoverParams {
  q?: string;
  cat?: string;
  date?: string;
  page?: number;
  /** Extra route (used by explore/saved/profile links). */
  path?: string;
}

export function sortByStart(a: { startsAt: string }, b: { startsAt: string }): number {
  return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
}

export function searchTerms(query: string | undefined): string[] {
  return (query ?? "").toLowerCase().trim().split(/\s+/).filter(Boolean);
}

export function matchesCategory(
  event: Pick<EventSummary, "category" | "startsAt" | "timezone">,
  category: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!category) return true;
  const timezone = event.timezone || DEFAULT_TIMEZONE;
  if (category === "Today") return isToday(event.startsAt, timezone, now);
  if (category === "Weekend") return isWeekend(event.startsAt, timezone);
  return event.category === category;
}

export function matchesQuery(
  event: Pick<EventSummary, "title" | "category" | "venue" | "city" | "tags"> & { description?: string },
  query: string | undefined,
): boolean {
  const terms = searchTerms(query);
  if (terms.length === 0) return true;
  const haystack = [
    event.title,
    categoryLabel(event.category),
    event.venue,
    event.city ?? "",
    (event.tags ?? []).join(" "),
    event.description ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function matchesDate(
  event: Pick<EventSummary, "startsAt" | "timezone">,
  date: string | undefined,
): boolean {
  if (!date) return true;
  return dateKey(event.startsAt, event.timezone || DEFAULT_TIMEZONE) === date;
}

export function filterEvents(
  events: EventSummary[],
  filters: { q?: string; cat?: string; date?: string },
  options: { now?: Date; includeArchived?: boolean } = {},
): EventSummary[] {
  const now = options.now ?? new Date();
  return events
    .filter((event) => options.includeArchived || event.status === "published")
    .filter((event) => matchesQuery(event, filters.q))
    .filter((event) => matchesDate(event, filters.date))
    .filter((event) => matchesCategory(event, filters.cat, now))
    .sort(sortByStart);
}

export function paginate<T>(
  items: T[],
  page = 1,
  pageSize = PAGE_SIZE,
): { items: T[]; page: number; pageCount: number; total: number } {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: safePage, pageCount, total };
}

export function pageNumbers(page: number, pageCount: number): Array<number | "…"> {
  const numbers: Array<number | "…"> = [];
  for (let i = 1; i <= pageCount; i += 1) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) {
      numbers.push(i);
    } else if (numbers[numbers.length - 1] !== "…") {
      numbers.push("…");
    }
  }
  return numbers;
}

export function buildDiscoverHref(params: DiscoverParams): string {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.cat) search.set("cat", params.cat);
  if (params.date) search.set("date", params.date);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  const base = params.path ?? "/";
  return query ? `${base}?${query}` : base;
}

export function coverStyle(
  event: Pick<EventSummary, "heroImageUrl" | "colorFrom" | "colorTo">,
): Record<string, string> {
  if (event.heroImageUrl) {
    return { background: `url(${event.heroImageUrl}) center/cover` };
  }
  return {
    background: `radial-gradient(circle at 78% 14%, rgba(255,255,255,.55), transparent 36%), linear-gradient(160deg, ${event.colorFrom}, ${event.colorTo})`,
  };
}

export function isGradientCover(event: Pick<EventSummary, "heroImageUrl">): boolean {
  return !event.heroImageUrl;
}

/**
 * Price facts for a card. Free events never carry a price, paid events use their
 * cheapest tier, and an event with no usable tier stays unknown rather than free.
 */
export function pricingFrom(
  isFree: boolean,
  prices: Array<number | string>,
): { priceFrom: number | null; priceTierCount: number } {
  const valid = prices
    .map((price) => Number(price))
    .filter((price) => Number.isFinite(price) && price > 0);
  return {
    priceFrom: isFree || valid.length === 0 ? null : Math.min(...valid),
    priceTierCount: valid.length,
  };
}

/**
 * Card price label: FREE only when the organiser marked the event free, the
 * cheapest tier for paid events, and nothing at all when the price is unknown.
 */
export function priceLabel(event: Pick<EventSummary, "isFree" | "priceFrom" | "priceTierCount">): string | null {
  if (event.isFree) return "FREE";
  if (event.priceFrom == null || !Number.isFinite(event.priceFrom)) return null;
  const amount = money(Math.round(event.priceFrom));
  return event.priceTierCount > 1 ? `From ${amount}` : amount;
}

export function ticketSummary(
  tickets: Array<{ name: string; price: number }>,
  tables: Array<{ seats: number; quantity: number }>,
): { labels: string[]; tablesLabel: string } {
  return {
    labels: tickets.map((t) => `${t.name} ₦${Number(t.price).toLocaleString("en-US")}`),
    tablesLabel: tables.length
      ? tables.map((t) => `${t.quantity} × table of ${t.seats}`).join(", ")
      : "No tables",
  };
}

export interface EventAccessFacts {
  status: EventStatus;
  visibility: "public" | "private";
  organiserId: string;
  isAdminViewer?: boolean;
}

/**
 * Mirrors public.can_view_event() in Supabase: the organiser, administrators and
 * attendees holding an explicit grant may read a private event; everyone else may
 * read a published public event.
 */
export function canViewEvent(
  event: EventAccessFacts,
  viewerId: string | null,
  isAdmin = false,
  hasAccessGrant = false,
): boolean {
  if (viewerId && event.organiserId === viewerId) return true;
  if (isAdmin || event.isAdminViewer) return true;
  if (event.status !== "published") return false;
  return event.visibility === "public" || hasAccessGrant;
}

export function canEditEvent(
  event: Pick<EventDetail, "organiserId" | "status">,
  viewerId: string | null,
  isAdmin = false,
): boolean {
  if (!viewerId) return false;
  if (isAdmin) return true;
  return event.organiserId === viewerId && event.status !== "removed";
}
