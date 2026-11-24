import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyAgeStatus, needsAgeVerification } from "@/lib/services/age";
import type { Profile, UserRole, Viewer } from "@/lib/types/domain";

async function loadViewer(): Promise<Viewer | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email ?? "",
      profile: profile
        ? {
            id: profile.id,
            fullName: profile.full_name,
            role: profile.role as UserRole,
            avatarUrl: profile.avatar_url,
            createdAt: profile.created_at,
          }
        : null,
    };
  } catch {
    return null;
  }
}

/** Request-scoped viewer. Null when signed out or Supabase is not configured. */
export const getViewer = cache(loadViewer);

export function viewerRole(viewer: Viewer | null): UserRole | null {
  return viewer?.profile?.role ?? null;
}

export async function requireUser(nextPath = "/profile"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireUser("/admin");
  if (viewer.profile?.role !== "admin") {
    redirect("/profile?notice=admin-only");
  }
  return viewer;
}

/**
 * Publishing needs a verified 18+ account. Accounts created before the rule are
 * sent to the one-field verification screen instead of being blocked outright.
 */
export async function requireVerifiedAdult(nextPath = "/events/new"): Promise<Viewer> {
  const viewer = await requireUser(nextPath);
  const status = await getMyAgeStatus();
  if (needsAgeVerification(status)) {
    redirect(`/verify-age?next=${encodeURIComponent(nextPath)}`);
  }
  return viewer;
}

export function canPublish(profile: Profile | null): boolean {
  return profile?.role === "organiser" || profile?.role === "admin";
}
