"use client";

import { useStatusAlert } from "@/components/ui/useStatusAlert";
import { routeAuthMessage } from "@/lib/auth/fieldErrors";

interface Options {
  /** Tone for `status: "notice"` results. */
  noticeTone?: "success" | "info";
  /** Keep password messages on the alert instead of the field (forms without one). */
  routeFields?: boolean;
}

/**
 * Splits an auth action result into a form-level alert and any field-level
 * password error, so a single failure is reported in exactly one place.
 */
export function useAuthAlert(
  state: { status: string; message?: string | null },
  { noticeTone = "success", routeFields = true }: Options = {},
) {
  const { alert, dismiss } = useStatusAlert(state, { noticeTone });
  const routed = routeFields ? routeAuthMessage(alert?.message) : null;

  return {
    alert: routed?.field ? null : alert,
    passwordError: routed?.field === "password" ? routed.message : null,
    confirmPasswordError: routed?.field === "confirmPassword" ? routed.message : null,
    dismiss,
  };
}
