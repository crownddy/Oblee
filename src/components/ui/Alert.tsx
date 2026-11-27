"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

export type AlertTone = "error" | "success" | "warning" | "info";

const TONE_ICON = {
  error: "bang",
  success: "checkc",
  warning: "warn",
  info: "info",
} as const satisfies Record<AlertTone, string>;

interface AlertProps {
  tone: AlertTone;
  children: ReactNode;
  /** Short heading above the message. */
  title?: string;
  /** Called by the close button; the alert stays mounted until the owner removes it. */
  onDismiss: () => void;
  dismissLabel?: string;
  id?: string;
  className?: string;
}

/**
 * Inline status message. Errors announce assertively, everything else politely.
 * It sits in normal flow, never as an overlay, so it cannot cover form controls.
 */
export function Alert({ tone, children, title, onDismiss, dismissLabel, id, className }: AlertProps) {
  const isError = tone === "error";

  return (
    <div
      id={id}
      className={className ? `alert ${className}` : "alert"}
      data-tone={tone}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <span className="alert-ic" aria-hidden="true">
        <Icon name={TONE_ICON[tone]} size={18} />
      </span>
      <div className="alert-body">
        {title ? <b className="alert-title">{title}</b> : null}
        <span className="alert-text">{children}</span>
      </div>
      <button
        type="button"
        className="alert-x"
        onClick={onDismiss}
        aria-label={dismissLabel ?? "Dismiss message"}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
