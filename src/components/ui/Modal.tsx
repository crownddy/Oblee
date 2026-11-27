"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  label: string;
  /** id of the heading that names the dialog; prefer this over `label`. */
  labelledBy?: string;
  /** Set false while a request is in flight so the sheet cannot be dismissed mid-action. */
  dismissible?: boolean;
  children: ReactNode;
}

export function Modal({ open, onClose, label, labelledBy, dismissible = true, children }: ModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const requestClose = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;

      const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (items.length === 0) return;

      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === sheetRef.current)) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;

    const target = sheetRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? sheetRef.current;
    target?.focus();

    return () => {
      restoreRef.current?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  // The sheet belongs to the app frame, not to the button that opened it: rendering it
  // in place anchors it to the action bar and clips it. Portal it into #app instead.
  const host = document.getElementById("app") ?? document.body;

  return createPortal(
    <div
      className="ovl on"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={sheetRef}
        className="msh"
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    host,
  );
}
