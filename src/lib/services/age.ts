import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AgeStatus {
  hasDateOfBirth: boolean;
  isAdult: boolean;
  dateOfBirth: string | null;
}

export const AGE_VERIFICATION_REQUIRED = "Verify your age before publishing events.";

/** Age signals for the signed-in account. Null when signed out or unconfigured. */
export async function getMyAgeStatus(): Promise<AgeStatus | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc("my_age_status");
    if (error || !data) return null;

    const raw = data as { date_of_birth?: string | null; has_date_of_birth?: boolean; is_adult?: boolean };
    return {
      hasDateOfBirth: Boolean(raw.has_date_of_birth),
      isAdult: Boolean(raw.is_adult),
      dateOfBirth: raw.date_of_birth ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * True when the account still has to prove the 18+ rule: either no date of birth
 * on record (accounts created before the rule) or a date the server rejects.
 */
export function needsAgeVerification(status: AgeStatus | null): boolean {
  if (!status) return false;
  return !status.hasDateOfBirth || !status.isAdult;
}
