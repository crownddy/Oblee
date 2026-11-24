import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventStatus } from "@/lib/constants";
import type { AdminUser, EventReport, FeaturedEvent, UserRole } from "@/lib/types/domain";

export interface AdminSummary {
  users: number;
  publishedEvents: number;
  openReports: number;
  featuredEvents: number;
}

export interface AdminEvent {
  id: string;
  title: string;
  organiserName: string;
  status: EventStatus;
  startsAt: string;
  isFeatured: boolean;
}

/** Administrator queries rely entirely on RLS and on the admin-only RPCs. */
export async function getAdminSummary(): Promise<AdminSummary> {
  if (!isSupabaseConfigured) return { users: 0, publishedEvents: 0, openReports: 0, featuredEvents: 0 };

  const supabase = await createSupabaseServerClient();
  const [users, published, reports, featured] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("event_reports").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
    supabase.from("featured_events").select("event_id", { count: "exact", head: true }),
  ]);

  return {
    users: users.count ?? 0,
    publishedEvents: published.count ?? 0,
    openReports: reports.count ?? 0,
    featuredEvents: featured.count ?? 0,
  };
}

export async function adminListUsers(): Promise<AdminUser[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) {
    console.error("admin_list_users", error.message);
    return [];
  }

  const rows = (data ?? []) as Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: UserRole;
    created_at: string;
    age_verified: boolean | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name ?? "",
    email: row.email ?? "",
    role: row.role,
    avatarUrl: null,
    createdAt: row.created_at,
    ageVerified: Boolean(row.age_verified),
  }));
}

interface AdminEventRow {
  id: string;
  title: string;
  status: EventStatus;
  starts_at: string;
  organiser_id: string;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  featured_events: Array<{ rank: number }> | { rank: number } | null;
}

function organiserName(row: AdminEventRow): string {
  const join = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return join?.full_name ?? "Unknown organiser";
}

function hasFeatured(value: AdminEventRow["featured_events"]): boolean {
  if (!value) return false;
  return Array.isArray(value) ? value.length > 0 : true;
}

export async function adminListEvents(status?: EventStatus): Promise<AdminEvent[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("events")
    .select("id, title, status, starts_at, organiser_id, profiles(full_name), featured_events(rank)")
    .order("starts_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("adminListEvents", error.message);
    return [];
  }

  return ((data ?? []) as unknown as AdminEventRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    organiserName: organiserName(row),
    status: row.status,
    startsAt: row.starts_at,
    isFeatured: hasFeatured(row.featured_events),
  }));
}

export async function adminListPublishedForFeature(): Promise<Array<{ id: string; title: string }>> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("starts_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("adminListPublishedForFeature", error.message);
    return [];
  }
  return (data ?? []) as Array<{ id: string; title: string }>;
}

interface ReportRow {
  id: string;
  event_id: string;
  reason: string;
  details: string;
  status: EventReport["status"];
  created_at: string;
  events: { title: string } | { title: string }[] | null;
  reporter: { full_name: string | null } | { full_name: string | null }[] | null;
}

export async function adminListReports(): Promise<EventReport[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("event_reports")
    .select("id, event_id, reason, details, status, created_at, events(title), reporter:profiles!event_reports_reporter_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("adminListReports", error.message);
    return [];
  }

  return ((data ?? []) as unknown as ReportRow[]).map((row) => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    const reporter = Array.isArray(row.reporter) ? row.reporter[0] : row.reporter;
    return {
      id: row.id,
      eventId: row.event_id,
      eventTitle: event?.title ?? "Deleted event",
      reporterName: reporter?.full_name ?? "Oblee member",
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.created_at,
    };
  });
}

interface FeaturedRow {
  event_id: string;
  rank: number;
  events: { title: string; starts_at: string; status: EventStatus } | Array<{ title: string; starts_at: string; status: EventStatus }> | null;
}

export async function adminListFeatured(): Promise<FeaturedEvent[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("featured_events")
    .select("event_id, rank, events!inner(title, starts_at, status)")
    .order("rank", { ascending: true })
    .limit(50);

  if (error) {
    console.error("adminListFeatured", error.message);
    return [];
  }

  return ((data ?? []) as unknown as FeaturedRow[]).map((row) => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    return {
      eventId: row.event_id,
      title: event?.title ?? "Event",
      rank: row.rank,
      startsAt: event?.starts_at ?? "",
      status: event?.status ?? "published",
    };
  });
}
