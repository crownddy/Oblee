/**
 * Hand-maintained types for the Oblee Supabase schema.
 * Source of truth: supabase/migrations/*.sql
 * Regenerate with `supabase gen types typescript --project-id <ref> > src/lib/types/database.ts`
 * once a Supabase project is linked.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "attendee" | "organiser" | "admin";
export type EventStatus = "published" | "archived" | "removed";
export type EventVisibility = "public" | "private";
export type ContactKind = "whatsapp" | "call" | "email";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type EventCategory =
  | "party"
  | "music"
  | "concert"
  | "festival"
  | "food"
  | "network"
  | "fashion_show"
  | "webinar"
  | "carnival"
  | "owambe"
  | "trade_show";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organiser_id: string;
          title: string;
          category: EventCategory;
          description: string;
          venue: string;
          city: string | null;
          starts_at: string;
          timezone: string;
          visibility: EventVisibility;
          security_note: string;
          identity_note: string;
          hero_image_url: string | null;
          color_from: string;
          color_to: string;
          tags: string[];
          is_free: boolean;
          status: EventStatus;
          published_at: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organiser_id: string;
          title: string;
          category: EventCategory;
          description?: string;
          venue: string;
          city?: string | null;
          starts_at: string;
          timezone?: string;
          visibility?: EventVisibility;
          security_note?: string;
          identity_note?: string;
          hero_image_url?: string | null;
          color_from?: string;
          color_to?: string;
          tags?: string[];
          is_free?: boolean;
          status?: EventStatus;
          published_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          category?: EventCategory;
          description?: string;
          venue?: string;
          city?: string | null;
          starts_at?: string;
          timezone?: string;
          visibility?: EventVisibility;
          security_note?: string;
          identity_note?: string;
          hero_image_url?: string | null;
          color_from?: string;
          color_to?: string;
          tags?: string[];
          is_free?: boolean;
          status?: EventStatus;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      event_ticket_tiers: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          price: number;
          position: number;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          price: number;
          position?: number;
        };
        Update: {
          name?: string;
          price?: number;
          position?: number;
        };
        Relationships: [];
      };
      event_tables: {
        Row: {
          id: string;
          event_id: string;
          seats: number;
          quantity: number;
          position: number;
        };
        Insert: {
          id?: string;
          event_id: string;
          seats: number;
          quantity: number;
          position?: number;
        };
        Update: {
          seats?: number;
          quantity?: number;
          position?: number;
        };
        Relationships: [];
      };
      event_contacts: {
        Row: {
          id: string;
          event_id: string;
          kind: ContactKind;
          caption: string;
          country_code: string;
          value: string;
          position: number;
        };
        Insert: {
          id?: string;
          event_id: string;
          kind: ContactKind;
          caption: string;
          country_code?: string;
          value: string;
          position?: number;
        };
        Update: {
          kind?: ContactKind;
          caption?: string;
          country_code?: string;
          value?: string;
          position?: number;
        };
        Relationships: [];
      };
      saved_events: {
        Row: {
          user_id: string;
          event_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          event_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      event_reports: {
        Row: {
          id: string;
          event_id: string;
          reporter_id: string;
          reason: string;
          details: string;
          status: ReportStatus;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          reporter_id: string;
          reason: string;
          details?: string;
          status?: ReportStatus;
        };
        Update: {
          status?: ReportStatus;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [];
      };
      featured_events: {
        Row: {
          event_id: string;
          rank: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          event_id: string;
          rank?: number;
          created_by?: string | null;
        };
        Update: {
          rank?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_event: { Args: { payload: Json }; Returns: string };
      update_event: { Args: { p_event_id: string; payload: Json }; Returns: undefined };
      archive_event: { Args: { p_event_id: string }; Returns: undefined };
      restore_event: { Args: { p_event_id: string }; Returns: undefined };
      set_event_featured: {
        Args: { p_event_id: string; p_featured: boolean; p_rank?: number };
        Returns: undefined;
      };
      report_event: {
        Args: { p_event_id: string; p_reason: string; p_details?: string };
        Returns: string;
      };
      resolve_event_report: {
        Args: { p_report_id: string; p_status: ReportStatus };
        Returns: undefined;
      };
      set_user_role: { Args: { p_user_id: string; p_role: UserRole }; Returns: undefined };
      remove_event: { Args: { p_event_id: string }; Returns: undefined };
      promote_to_organiser: { Args: Record<string, never>; Returns: undefined };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: Array<{
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          created_at: string;
        }>;
      };
    };
    Enums: {
      user_role: UserRole;
      event_status: EventStatus;
      event_visibility: EventVisibility;
      event_category: EventCategory;
      contact_kind: ContactKind;
      report_status: ReportStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
