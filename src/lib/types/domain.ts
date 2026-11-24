import type { ContactKind, EventCategory, EventStatus } from "@/lib/constants";

export type UserRole = "attendee" | "organiser" | "admin";

export interface Profile {
  id: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: string;
}

export interface AdminUser extends Profile {
  email: string;
}

export interface EventContact {
  kind: ContactKind;
  caption: string;
  countryCode: string;
  value: string;
}

export interface TicketTier {
  name: string;
  price: number;
}

export interface EventTable {
  seats: number;
  quantity: number;
}

export interface EventSummary {
  id: string;
  title: string;
  category: EventCategory;
  venue: string;
  city: string | null;
  startsAt: string;
  timezone: string;
  isFree: boolean;
  heroImageUrl: string | null;
  colorFrom: string;
  colorTo: string;
  status: EventStatus;
  visibility: "public" | "private";
  organiserId: string;
  organiserName: string;
  tags: string[];
  /** True when the current viewer has saved the event. */
  isSaved: boolean;
}

export interface EventDetail extends EventSummary {
  description: string;
  securityNote: string;
  identityNote: string;
  publishedAt: string | null;
  archivedAt: string | null;
  tickets: TicketTier[];
  tables: EventTable[];
  contacts: EventContact[];
  organiserAvatarUrl: string | null;
  isFeatured: boolean;
  isOwner: boolean;
  isAdminViewer: boolean;
  /** True when the viewer is signed in and does not own the event. */
  canReport: boolean;
  isReportedByViewer: boolean;
}

export interface EventReport {
  id: string;
  eventId: string;
  eventTitle: string;
  reporterName: string;
  reason: string;
  details: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
}

export interface FeaturedEvent {
  eventId: string;
  title: string;
  rank: number;
  startsAt: string;
  status: EventStatus;
}

export interface EventFilters {
  query?: string;
  category?: string;
  date?: string;
  page?: number;
  timezone?: string;
}

export interface EventListResult {
  events: EventSummary[];
  total: number;
  page: number;
  pageCount: number;
}

export interface Viewer {
  id: string;
  email: string;
  profile: Profile | null;
}
