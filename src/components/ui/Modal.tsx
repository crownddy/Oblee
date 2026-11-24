"use client";

import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ovl on" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="msh" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
