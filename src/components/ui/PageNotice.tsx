"use client";

import { useState, type ReactNode } from "react";
import { Alert, type AlertTone } from "@/components/ui/Alert";

/** Dismissible alert for notices that arrive with the page (query flags, redirects). */
export function PageNotice({ tone, children }: { tone: AlertTone; children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  return (
    <Alert tone={tone} onDismiss={() => setDismissed(true)}>
      {children}
    </Alert>
  );
}
