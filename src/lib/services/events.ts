import { PAGE_SIZE, DEFAULT_TIMEZONE, FEATURED_LIMIT } from "@/lib/constants";
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
import { filterEvents, paginate, sortByStart } from "@/lib/utils/events";
import { resolveDateFilter } from "@/lib/utils/ranges";
import { searchTerms } from "@/lib/utils/events";

const EVENT_COLUMNS =
  "id, title, category, venue, city, starts_at, timezone, is_free, hero_image_url, color_from, color_to, status, organiser_id, tags, description, security_note, identity_note, visibility, published_at, archived_at, profiles!events_organiser_id_fkey(full_name, avatar_url), featured_events(rank)";

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

function mapSummary(row: EventRow, savedIds: Set<string>): EventSummary {
  const organiser = organiserJoin(row.profiles);
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    venue: row.venue,
    city: row.city,
    startsAt: row.starts_at,
    timezone: row.timezone || DEFAULT_TIMEZONE,
    isFree: row.is_free,
    heroImageUrl: row.hero_image_url,
    colorFrom: row.color_from,
    colorTo: row.color_to,
    status: row.status,
    organiserId: row.organiser_id,
    organiserName: organiser?.full_name || "Oblee organiser",
    tags: row.tags ?? [],
    isSaved: savedIds.has(row.id),
  };
}

async function savedIdsFor(viewer: Viewer | null): Promise<Set<string>> {
  if (!viewer) return new Set();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("saved_events").select("event_id").eq("user_id", viewer.id);
  return new Set((data ?? []).map((row) => row.event_id));
}

function escapeTerm(term: string): string {
  return term.replace(/[%,(){}*"\\]/g, " ").trim();
}

export interface ListEventsOptions {
  query?: string;
  category?: string;
  date?: string;
  page?: number;
  pageSize?: number;
}

export async function listPublishedEvents(options: ListEventsOptions = {}): Promise<EventListResult> {
  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const viewer = await getViewer();

  if (!isSupabaseConfigured) {
    const filtered = filterEvents(
      demoEventSummaries().map((event) =>
        viewer ? { ...event, isSaved: false } : event,
      ),
      { q: options.query, cat: options.category, date: options.date },
    );
    const result = paginate(filtered, page, pageSize);
    return {
      events: result.items,
      total: result.total,
      page: result.page,
      pageCount: result.pageCount,
    };
  }

  const supabase = await createSupabaseServerClient();
  const range = resolveDateFilter(options.category, options.date, new Date(), DEFAULT_TIMEZONE);

  let query = supabase
    .from("events")
    .select(EVENT_COLUMNS, { count: "exact" })
    .eq("status", "published");

  if (range) {
    query = query.gte("starts_at", range.start).lt("starts_at", range.endExclusive);
  } else if (options.category) {
    query = query.eq("category", options.category as EventCategory);
  }

  for (const term of searchTerms(options.query).map(escapeTerm).filter(Boolean)) {
    query = query.or(
      [
        `title.ilike.%${term}%`,
        `venue.ilike.%${term}%`,
        `city.ilike.%${term}%`,
        `description.ilike.%${term}%`,
      ].join(","),
    );
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order("starts_at", { ascending: true })
    .range(from, from + pageSize - 1);

  if (error) {
    console.error("listPublishedEvents", error.message);
    throw new Error("Could not load events.");
  }

  const savedIds = await savedIdsFor(viewer);
  const total = count ?? 0;
  return {
    events: ((data ?? []) as unknown as EventRow[]).map((row) => mapSummary(row, savedIds)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

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
  const { data, error } = await supabase
    .from("featured_events")
    .select(`rank, events!inner(${EVENT_COLUMNS})`)
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("listFeaturedEvents", error.message);
    return [];
  }

  const savedIds = await savedIdsFor(viewer);
  const rows = (data ?? []) as unknown as Array<{ events: EventRow }>;
  return rows
    .map((row) => row.events)
    .filter((row) => row && row.status === "published")
    .slice(0, limit)
    .map((row) => mapSummary(row, savedIds));
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
  return {
    ...mapSummary(row, saved),
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
    .select(EVENT_COLUMNS)
    .eq("organiser_id", organiserId)
    .eq("status", options.archived ? "archived" : "published")
    .order("starts_at", { ascending: !options.archived });

  if (error) {
    console.error("listEventsForOrganiser", error.message);
    throw new Error("Could not load your events.");
  }

  const savedIds = new Set<string>();
  return ((data ?? []) as unknown as EventRow[]).map((row) => mapSummary(row, savedIds));
}

export async function listSavedEvents(viewer: Viewer): Promise<EventSummary[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_events")
    .select(`created_at, events!inner(${EVENT_COLUMNS})`)
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listSavedEvents", error.message);
    throw new Error("Could not load saved events.");
  }

  const rows = (data ?? []) as unknown as Array<{ events: EventRow }>;
  return rows
    .map((row) => row.events)
    .filter((row) => row && row.status === "published")
    .map((row) => mapSummary(row, new Set([row.id])));
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
