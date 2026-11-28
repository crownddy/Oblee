import { FEATURED_LIMIT } from "@/lib/constants";
import type {
  EventDetail,
  EventListResult,
  EventSummary,
  Viewer,
} from "@/lib/types/domain";
import type { EventCategory } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer, viewerRole } from "@/lib/auth/session";
import { demoEventSummaries, demoEvents, findDemoEvent } from "@/lib/demo/events";
import { canViewEvent, filterEvents, paginate, sortByStart } from "@/lib/utils/events";
import {
  buildDiscoveryQuery,
  normaliseCategoryParam,
  normaliseDateParam,
  resolvePage,
} from "@/lib/utils/discovery";
import { normaliseTimezone } from "@/lib/utils/format";
import { eventImagePath } from "@/lib/utils/images";
import { resolveEventImages } from "@/lib/services/storage";

const EVENT_COLUMNS =
  "id, title, category, venue, city, starts_at, timezone, is_free, hero_image_url, color_from, color_to, status, organiser_id, tags, description, security_note, identity_note, visibility, published_at, archived_at, profiles!events_organiser_id_fkey(full_name, avatar_url), featured_events(rank)";

const EVENT_LIST_COLUMNS = `${EVENT_COLUMNS}, event_ticket_tiers(price)`;

const EVENT_DETAIL_COLUMNS = `${EVENT_COLUMNS}, event_ticket_tiers(name, price, position), event_tables(seats, quantity, position), event_contacts(kind, caption, country_code, value, position)`;

interface OrganiserJoin {
  full_name: string | null;
  avatar_url?: string | null;
}

interface EventRow {
  id: string;
  title: string;
  category: EventCategory;
  venue: string;
  city: string | null;
  starts_at: string;
  timezone: string;
  is_free: boolean;
  hero_image_url: string | null;
  color_from: string;
  color_to: string;
  status: "published" | "archived" | "removed";
  organiser_id: string;
  tags: string[] | null;
  description: string;
  security_note: string;
  identity_note: string;
  visibility: "public" | "private";
  published_at: string | null;
  archived_at: string | null;
  profiles: OrganiserJoin | OrganiserJoin[] | null;
  featured_events: Array<{ rank: number }> | { rank: number } | null;
  event_ticket_tiers?: Array<{ price: number | string }> | null;
}

interface EventDetailRow extends EventRow {
  event_ticket_tiers: Array<{ name: string; price: number; position: number }> | null;
  event_tables: Array<{ seats: number; quantity: number; position: number }> | null;
  event_contacts: Array<{
    kind: "whatsapp" | "call" | "email";
    caption: string;
    country_code: string;
    value: string;
    position: number;
  }> | null;
}

function organiserJoin(value: EventRow["profiles"]): OrganiserJoin | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isFeatured(row: EventRow): boolean {
  const featured = row.featured_events;
  if (!featured) return false;
  return Array.isArray(featured) ? featured.length > 0 : Boolean(featured);
}

function coverUrl(row: EventRow, images?: Map<string, string | null>): string | null {
  if (!row.hero_image_url) return null;
  if (!images) return row.hero_image_url;
  return images.get(row.hero_image_url) ?? null;
}

function tierPrices(row: EventRow): number[] {
  return (row.event_ticket_tiers ?? [])
    .map((tier) => Number(tier.price))
    .filter((price) => Number.isFinite(price) && price > 0);
}

/** Cheapest tier for a paid event; null for free events and events with no pricing. */
function priceFrom(row: EventRow): number | null {
  if (row.is_free) return null;
  const prices = tierPrices(row);
  return prices.length > 0 ? Math.min(...prices) : null;
}

function mapSummary(
  row: EventRow,
  savedIds: Set<string>,
  images?: Map<string, string | null>,
): EventSummary {
  const organiser = organiserJoin(row.profiles);
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    venue: row.venue,
    city: row.city,
    startsAt: row.starts_at,
    timezone: normaliseTimezone(row.timezone),
    isFree: row.is_free,
    heroImageUrl: coverUrl(row, images),
    colorFrom: row.color_from,
    colorTo: row.color_to,
    status: row.status,
    visibility: row.visibility,
    organiserId: row.organiser_id,
    organiserName: organiser?.full_name?.trim() || null,
    tags: row.tags ?? [],
    priceFrom: priceFrom(row),
    priceTierCount: tierPrices(row).length,
    isSaved: savedIds.has(row.id),
  };
}

async function savedIdsFor(viewer: Viewer | null): Promise<Set<string>> {
  if (!viewer) return new Set();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("saved_events").select("event_id").eq("user_id", viewer.id);
  return new Set((data ?? []).map((row) => row.event_id));
}

export interface ListEventsOptions {
  query?: string;
  category?: string;
  date?: string;
  page?: number;
  pageSize?: number;
}

export async function listPublishedEvents(options: ListEventsOptions = {}): Promise<EventListResult> {
  const viewer = await getViewer();
  const discovery = buildDiscoveryQuery({
    query: options.query,
    category: options.category,
    date: options.date,
    page: options.page,
    pageSize: options.pageSize,
  });

  if (!isSupabaseConfigured) {
    const filtered = filterEvents(
      demoEventSummaries()
        .filter((event) => event.visibility === "public")
        .map((event) => (viewer ? { ...event, isSaved: false } : event)),
      {
        q: options.query,
        cat: normaliseCategoryParam(options.category),
        date: normaliseDateParam(options.date),
      },
    ).filter((event) => !discovery.upcomingFrom || Date.parse(event.startsAt) >= Date.parse(discovery.upcomingFrom));
    const result = paginate(filtered, discovery.page, discovery.pageSize);
    return {
      events: result.items,
      total: result.total,
      page: result.page,
      pageCount: result.pageCount,
    };
  }

  const supabase = await createSupabaseServerClient();

  const buildQuery = () => {
    let query = supabase
      .from("events")
      .select(EVENT_LIST_COLUMNS, { count: "exact" })
      .eq("status", "published")
      .eq("visibility", "public");

    if (discovery.range) {
      query = query.gte("starts_at", discovery.range.start).lt("starts_at", discovery.range.endExclusive);
    } else if (discovery.upcomingFrom) {
      query = query.gte("starts_at", discovery.upcomingFrom);
    }

    if (discovery.category) {
      query = query.eq("category", discovery.category);
    }

    for (const group of discovery.orGroups) {
      query = query.or(group.join(","));
    }

    return query.order("starts_at", { ascending: true });
  };

  const first = await buildQuery().range(discovery.from, discovery.to);

  if (first.error) {
    console.error("listPublishedEvents", first.error.message);
    throw new Error("Could not load events.");
  }

  const total = first.count ?? 0;
  const resolved = resolvePage(discovery.page, total, discovery.pageSize);
  let rows = (first.data ?? []) as unknown as EventRow[];

  // A page past the end returns no rows, so re-ask for the last page that exists.
  if (resolved.page !== discovery.page) {
    const last = await buildQuery().range(resolved.from, resolved.to);
    if (last.error) {
      console.error("listPublishedEvents", last.error.message);
      throw new Error("Could not load events.");
    }
    rows = (last.data ?? []) as unknown as EventRow[];
  }

  const savedIds = await savedIdsFor(viewer);
  const images = await resolveEventImages(rows.map((row) => row.hero_image_url));
  return {
    events: rows.map((row) => mapSummary(row, savedIds, images)),
    total,
    page: resolved.page,
    pageCount: resolved.pageCount,
  };
}

/**
 * Eligibility travels with the query rather than the result set: with `!inner`,
 * PostgREST turns these into joins, so stale placements (archived, removed or
 * private events) never occupy the ranked slots the limit counts.
 */
export const FEATURED_ELIGIBILITY_FILTERS = [
  { column: "events.status", value: "published" },
  { column: "events.visibility", value: "public" },
] as const;

export async function listFeaturedEvents(limit = FEATURED_LIMIT): Promise<EventSummary[]> {
  const viewer = await getViewer();

  if (!isSupabaseConfigured) {
    return demoEvents()
      .filter((event) => event.isFeatured && event.status === "published")
      .sort(sortByStart)
      .slice(0, limit)
      .map((event) => ({ ...event, isSaved: Boolean(viewer && event.isSaved) }));
  }

  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from("featured_events")
    .select(`rank, events!inner(${EVENT_LIST_COLUMNS})`)
    .order("rank", { ascending: true });
  for (const filter of FEATURED_ELIGIBILITY_FILTERS) {
    request = request.eq(filter.column, filter.value);
  }
  const { data, error } = await request.limit(limit);

  if (error) {
    console.error("listFeaturedEvents", error.message);
    return [];
  }

  const savedIds = await savedIdsFor(viewer);
  const rows = ((data ?? []) as unknown as Array<{ events: EventRow }>)
    .map((row) => row.events)
    .filter((row) => row && row.status === "published" && row.visibility === "public")
    .slice(0, limit);
  const images = await resolveEventImages(rows.map((row) => row.hero_image_url));
  return rows.map((row) => mapSummary(row, savedIds, images));
}

export async function getEventForViewer(id: string): Promise<EventDetail | null> {
  const viewer = await getViewer();

  if (!isSupabaseConfigured) {
    return findDemoEvent(id);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("getEventForViewer", error.message);
    throw new Error("Could not load this event.");
  }
  if (!data) return null;

  const row = data as unknown as EventDetailRow;
  const saved = await savedIdsFor(viewer);
  const isAdminViewer = viewerRole(viewer) === "admin";
  const isOwner = Boolean(viewer && viewer.id === row.organiser_id);

  let hasAccessGrant = false;
  if (row.visibility === "private" && viewer && !isOwner && !isAdminViewer) {
    const { data: grant } = await supabase
      .from("event_access")
      .select("event_id")
      .eq("event_id", row.id)
      .eq("user_id", viewer.id)
      .maybeSingle();
    hasAccessGrant = Boolean(grant);
  }

  // Defence in depth: Row Level Security already hides this row from unauthorised
  // callers, and this keeps the page honest if a policy is ever loosened.
  const accessFacts = {
    status: row.status,
    visibility: row.visibility,
    organiserId: row.organiser_id,
    isAdminViewer,
  };
  if (!canViewEvent(accessFacts, viewer?.id ?? null, isAdminViewer, hasAccessGrant)) return null;

  let isReportedByViewer = false;

  if (viewer && !isOwner) {
    const { data: report } = await supabase
      .from("event_reports")
      .select("id")
      .eq("event_id", row.id)
      .eq("reporter_id", viewer.id)
      .in("status", ["open", "reviewing"])
      .maybeSingle();
    isReportedByViewer = Boolean(report);
  }

  const organiser = organiserJoin(row.profiles);
  const images = await resolveEventImages([row.hero_image_url]);
  return {
    ...mapSummary(row, saved, images),
    heroImagePath: eventImagePath(row.hero_image_url),
    description: row.description,
    securityNote: row.security_note,
    identityNote: row.identity_note,
    visibility: row.visibility,
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
    tickets: [...(row.event_ticket_tiers ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((tier) => ({ name: tier.name, price: Number(tier.price) })),
    tables: [...(row.event_tables ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((table) => ({ seats: table.seats, quantity: table.quantity })),
    contacts: [...(row.event_contacts ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((contact) => ({
        kind: contact.kind,
        caption: contact.caption,
        countryCode: contact.country_code,
        value: contact.value,
      })),
    organiserAvatarUrl: organiser?.avatar_url ?? null,
    isFeatured: isFeatured(row),
    isOwner,
    isAdminViewer,
    canReport: Boolean(viewer && !isOwner && row.status === "published"),
    isReportedByViewer,
  };
}

export async function listEventsForOrganiser(
  organiserId: string,
  options: { archived?: boolean } = {},
): Promise<EventSummary[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_LIST_COLUMNS)
    .eq("organiser_id", organiserId)
    .eq("status", options.archived ? "archived" : "published")
    .order("starts_at", { ascending: !options.archived });

  if (error) {
    console.error("listEventsForOrganiser", error.message);
    throw new Error("Could not load your events.");
  }

  const savedIds = new Set<string>();
  const rows = (data ?? []) as unknown as EventRow[];
  const images = await resolveEventImages(rows.map((row) => row.hero_image_url));
  return rows.map((row) => mapSummary(row, savedIds, images));
}

export async function listSavedEvents(viewer: Viewer): Promise<EventSummary[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_events")
    .select(`created_at, events!inner(${EVENT_LIST_COLUMNS})`)
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listSavedEvents", error.message);
    throw new Error("Could not load saved events.");
  }

  const rows = ((data ?? []) as unknown as Array<{ events: EventRow }>)
    .map((row) => row.events)
    .filter((row) => row && row.status === "published");
  const images = await resolveEventImages(rows.map((row) => row.hero_image_url));
  return rows.map((row) => mapSummary(row, new Set([row.id]), images));
}

export async function countSavedEvents(viewer: Viewer): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("saved_events")
    .select("event_id", { count: "exact", head: true })
    .eq("user_id", viewer.id);
  return count ?? 0;
}
