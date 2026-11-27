"use client";

import { useState } from "react";
import type { AlertTone } from "@/components/ui/Alert";

export interface StatusState {
  status: string;
  message?: string | null;
}

interface Options {
  /** Tone for `status: "notice"` results; errors always use `error`. */
  noticeTone?: Extract<AlertTone, "success" | "info">;
}

/**
 * Turns an action result into a dismissible alert. Dismissal is remembered per
 * result object, so the next submission shows its own message again even when
 * the wording repeats. Nothing expires on a timer.
 */
export function useStatusAlert<S extends StatusState>(state: S, options: Options = {}) {
  const [dismissed, setDismissed] = useState<S | null>(null);
  const message = dismissed === state ? null : state.message?.trim() || null;
  const tone: AlertTone = state.status === "notice" ? options.noticeTone ?? "success" : "error";

  return {
    alert: message ? { tone, message } : null,
    dismiss: () => setDismissed(state),
  };
}
