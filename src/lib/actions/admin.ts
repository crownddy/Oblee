"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONFIG_REQUIRED_MESSAGE, isSupabaseConfigured } from "@/lib/supabase/config";
import type { UserRole } from "@/lib/types/domain";
import type { SimpleActionResult } from "@/lib/actions/events";

export async function setFeaturedAction(
  eventId: string,
  featured: boolean,
  rank = 0,
): Promise<SimpleActionResult> {
  await requireAdmin();
  if (!isSupabaseConfigured) return { ok: false, error: CONFIG_REQUIRED_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_event_featured", {
    p_event_id: eventId,
    p_featured: featured,
    p_rank: rank,
  });

  if (error) {
    console.error("set_event_featured", error.message);
    return { ok: false, error: "Could not update featured placement." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeEventAction(eventId: string): Promise<SimpleActionResult> {
  await requireAdmin();
  if (!isSupabaseConfigured) return { ok: false, error: CONFIG_REQUIRED_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("remove_event", { p_event_id: eventId });

  if (error) {
    console.error("remove_event", error.message);
    return { ok: false, error: "Could not remove this event." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setReportStatusAction(
  reportId: string,
  status: "reviewing" | "resolved" | "dismissed",
): Promise<SimpleActionResult> {
  await requireAdmin();
  if (!isSupabaseConfigured) return { ok: false, error: CONFIG_REQUIRED_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("resolve_event_report", {
    p_report_id: reportId,
    p_status: status,
  });

  if (error) {
    console.error("resolve_event_report", error.message);
    return { ok: false, error: "Could not update this report." };
  }

  revalidatePath("/admin/reports");
  return { ok: true };
}

export async function setUserRoleAction(userId: string, role: UserRole): Promise<SimpleActionResult> {
  await requireAdmin();
  if (!isSupabaseConfigured) return { ok: false, error: CONFIG_REQUIRED_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role });

  if (error) {
    console.error("set_user_role", error.message);
    return { ok: false, error: /own role/i.test(error.message) ? "You cannot change your own role." : "Could not change this role." };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}
