import { CATEGORIES, DEFAULT_TIMEZONE, PAGE_SIZE, isEventCategory, type EventCategory } from "@/lib/constants";
import { searchTerms } from "@/lib/utils/events";
import { resolveDateFilter, type InstantRange } from "@/lib/utils/ranges";

/** Longest `?q=` accepted by discovery; longer input is truncated, not rejected. */
export const MAX_QUERY_LENGTH = 80;

/**
 * Characters that would let a search term escape its filter inside a PostgREST
 * `or=(...)` list (`,` `(` `)` `{}` `"` `\`) or act as an ILIKE wildcard (`%`, `*`).
 */
const UNSAFE_TERM_CHARS = /[%,(){}*"\\]/g;

/** Columns the search covers, in the order the SQL uses them. */
export const SEARCH_TEXT_FIELDS = ["title", "venue", "city", "description"] as const;

export function escapeSearchTerm(term: string): string {
  return term.replace(UNSAFE_TERM_CHARS, " ").trim();
}

/** Case-insensitive, whitespace-separated, de-duplicated, escaped search terms. */
export function normaliseSearchTerms(query: string | undefined): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of searchTerms((query ?? "").slice(0, MAX_QUERY_LENGTH))) {
    // Escaping turns separators into spaces, so split again to keep every term
    // free of whitespace and safe to drop into an ILIKE pattern.
    for (const term of escapeSearchTerm(raw).split(/\s+/)) {
      if (!term || seen.has(term)) continue;
      seen.add(term);
      terms.push(term);
    }
  }
  return terms;
}

/** Categories whose label or stored value contains the term, so "fashion" finds `fashion_show`. */
export function categoriesMatching(term: string): EventCategory[] {
  return CATEGORIES.filter(
    (category) => category.label.toLowerCase().includes(term) || category.value.includes(term),
  ).map((category) => category.value);
}

/**
 * The filters ORed together for a single search term. Values come from the
 * escaped term and from CATEGORIES only, never from raw user input.
 */
export function orFiltersForTerm(term: string): string[] {
  const filters = SEARCH_TEXT_FIELDS.map((field) => `${field}.ilike.%${term}%`);
  filters.push(`tags.cs.{${term}}`);
  const categories = categoriesMatching(term);
  if (categories.length > 0) filters.push(`category.in.(${categories.join(",")})`);
  return filters;
}

/** Keeps a valid category or quick date shortcut; anything else is ignored. */
export function normaliseCategoryParam(raw: string | undefined): string {
  if (!raw) return "";
  if (raw === "Today" || raw === "Weekend") return raw;
  return isEventCategory(raw) ? raw : "";
}

/** Accepts `YYYY-MM-DD` calendar dates only; rejects impossible days such as 2026-02-31. */
export function normaliseDateParam(raw: string | undefined): string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) return "";
  return raw;
}

export function pageWindow(page: number | undefined, pageSize: number = PAGE_SIZE) {
  const size = Math.max(1, Math.trunc(pageSize) || PAGE_SIZE);
  const safePage = Math.max(1, Math.trunc(page ?? 1) || 1);
  return { page: safePage, pageSize: size, from: (safePage - 1) * size, to: safePage * size - 1 };
}

/** Clamps a requested page to the pages that exist, once the total is known. */
export function resolvePage(requested: number, total: number, pageSize: number = PAGE_SIZE) {
  const size = Math.max(1, Math.trunc(pageSize) || PAGE_SIZE);
  const safeTotal = Math.max(0, Math.trunc(total) || 0);
  const pageCount = Math.max(1, Math.ceil(safeTotal / size));
  const page = Math.min(Math.max(1, Math.trunc(requested) || 1), pageCount);
  return { page, pageCount, total: safeTotal, from: (page - 1) * size, to: page * size - 1 };
}

export interface DiscoveryQueryInput {
  query?: string;
  category?: string;
  date?: string;
  page?: number;
  pageSize?: number;
  now?: Date;
}

export interface DiscoveryQuery {
  /** Explicit range from a date or the Today/Weekend shortcuts. Authoritative when present. */
  range: InstantRange | null;
  /** Lower bound used when no explicit range applies: discovery never shows the past. */
  upcomingFrom: string | null;
  category: EventCategory | null;
  terms: string[];
  orGroups: string[][];
  page: number;
  pageSize: number;
  from: number;
  to: number;
}

export function buildDiscoveryQuery(input: DiscoveryQueryInput = {}): DiscoveryQuery {
  const now = input.now ?? new Date();
  const categoryParam = normaliseCategoryParam(input.category);
  const date = normaliseDateParam(input.date);
  const range = resolveDateFilter(categoryParam || undefined, date || undefined, now, DEFAULT_TIMEZONE);
  const terms = normaliseSearchTerms(input.query);

  return {
    range,
    upcomingFrom: range ? null : now.toISOString(),
    category: isEventCategory(categoryParam) ? categoryParam : null,
    terms,
    orGroups: terms.map(orFiltersForTerm),
    ...pageWindow(input.page, input.pageSize),
  };
}
