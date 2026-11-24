"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_TIMEZONE, EVENT_IMAGE_BUCKET } from "@/lib/constants";
import { CONFIG_REQUIRED_MESSAGE, isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canPublish, requireUser } from "@/lib/auth/session";
import { eventInputSchema, type EventInput } from "@/lib/validation/event";
import { reportEventSchema } from "@/lib/validation/auth";
import { toInstant, todayKey } from "@/lib/utils/format";

export type EventActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type SimpleActionResult = { ok: true } | { ok: false; error: string };

function buildPayload(input: EventInput) {
  const timezone = DEFAULT_TIMEZONE;
  const startsAt = toInstant(input.date, input.time, timezone);
  return {
    title: input.title,
    category: input.category,
    visibility: input.visibility,
    starts_at: startsAt,
    timezone,
    venue: input.venue,
    city: input.city?.trim() ? input.city.trim() : null,
    description: input.description,
    security_note: input.securityNote,
    identity_note: input.identityNote,
    hero_image_url: input.heroImageUrl,
    color_from: input.colorFrom,
    color_to: input.colorTo,
    tags: input.tags,
    is_free: input.isFree,
    tickets: input.isFree ? [] : input.tickets,
    tables: input.tables,
    contacts: input.contacts,
  };
}

function validateBusinessRules(input: EventInput): string | null {
  const timezone = DEFAULT_TIMEZONE;
  if (input.date < todayKey(timezone)) {
    return "Pick today or a future date.";
  }
  if (input.heroImageUrl && !input.heroImageUrl.includes(`${EVENT_IMAGE_BUCKET}/`)) {
    return "Upload the event image through Oblee.";
  }
  return null;
}

export async function createEventAction(input: EventInput): Promise<EventActionResult> {
  const viewer = await requireUser("/events/new");
  if (!isSupabaseConfigured) return { ok: false, error: CONFIG_REQUIRED_MESSAGE };
  if (!canPublish(viewer.profile)) {
    return { ok: false, error: "Switch your account to an organiser to post events." };
  }

  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your event details." };
  }
  const businessError = validateBusinessRules(parsed.data);
  if (businessError) return { ok: false, error: businessError };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_event", { payload: buildPayload(parsed.data) });

  if (error || !data) {
    console.error("create_event", error?.message);
    return { ok: false, error: "We could not publish your event. Try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true, id: data as unknown as string };
}

export async function updateEventAction(eventId: string, input: EventInput): Promise<EventActionResult> {
  await requireUser(`/events/${eventId}/edit`);
  if (!isSupabaseConfigured) return { ok: false, error: CONFIG_REQUIRED_MESSAGE };

  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your event details." };
  }
  const businessError = validateBusinessRules(parsed.data);
  if (businessError) return { ok: false, error: businessError };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_event", {
    p_event_id: eventId,
    payload: buildPayload(parsed.data),
  });

  if (error) {
    console.error("update_event", error.message);
    const message = /not found|permission|denied/i.test(error.message)
      ? "You can only edit your own events."
      : "We could not save your changes. Try again.";
    return { ok: false, error: message };
  }

  revalidatePath("/", "layout");
  return { ok: true, id: eventId };
}

export async function archiveEventAction(eventId: string): Promise<SimpleActionResult> {
  const viewer = await requireUser(`/events/${eventId}`);
  if (!isSupabaseConfigured) return { ok: false, error: CONFIG_REQUIRED_MESSAGE };
  if (!viewer.profile) return { ok: false, error: "Your profile is not ready yet." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("archive_event", { p_event_id: eventId });
  if (error) {
    console.error("archive_event", error.message);
    return { ok: false, error: "We could not archive this event." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleSaveAction(eventId: string, save: boolean): Promise<SimpleActionResult> {
  const viewer = await requireUser("/saved");
  if (!isSupabaseConfigured) return { ok: false, error: CONFIG_REQUIRED_MESSAGE };

  const supabase = await createSupabaseServerClient();
  if (save) {
    const { error } = await supabase
      .from("saved_events")
      .insert({ user_id: viewer.id, event_id: eventId });
    if (error && error.code !== "23505") {
      console.error("save_event", error.message);
      return { ok: false, error: "We could not save this event." };
    }
  } else {
    const { error } = await supabase
      .from("saved_events")
      .delete()
      .eq("user_id", viewer.id)
      .eq("event_id", eventId);
    if (error) {
      console.error("unsave_event", error.message);
      return { ok: false, error: "We could not remove this event." };
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function reportEventAction(
  eventId: string,
  reason: string,
  details: string,
): Promise<SimpleActionResult> {
  await requireUser(`/events/${eventId}`);
  if (!isSupabaseConfigured) return { ok: false, error: CONFIG_REQUIRED_MESSAGE };

  const parsed = reportEventSchema.safeParse({ reason, details });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Add a reason for the report." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("report_event", {
    p_event_id: eventId,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details,
  });

  if (error) {
    console.error("report_event", error.message);
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: false, error: "You have already reported this event. Our team is reviewing it." };
    }
    if (/own event/i.test(error.message)) {
      return { ok: false, error: "You cannot report your own event." };
    }
    return { ok: false, error: "We could not send your report. Try again." };
  }

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function promoteToOrganiserAction(): Promise<SimpleActionResult> {
  await requireUser("/profile");
  if (!isSupabaseConfigured) return { ok: false, error: CONFIG_REQUIRED_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("promote_to_organiser");
  if (error) {
    console.error("promote_to_organiser", error.message);
    return { ok: false, error: "We could not upgrade your account. Try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
