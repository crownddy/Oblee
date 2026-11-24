"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface UIContextValue {
  toast: (message: string) => void;
  openAppearance: () => void;
  closeAppearance: () => void;
  appearanceOpen: boolean;
  message: string | null;
}

const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const value = useContext(UIContext);
  if (!value) {
    throw new Error("useUI must be used inside the Oblee app shell.");
  }
  return value;
}

export function UIProvider({
  children,
  renderAppearance,
}: {
  children: React.ReactNode;
  renderAppearance: (open: boolean, close: () => void) => React.ReactNode;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback(
    (next: string) => {
      setMessage(next);
      if (timer) clearTimeout(timer);
      setTimer(setTimeout(() => setMessage(null), 2800));
    },
    [timer],
  );

  const value = useMemo<UIContextValue>(
    () => ({
      toast,
      openAppearance: () => setAppearanceOpen(true),
      closeAppearance: () => setAppearanceOpen(false),
      appearanceOpen,
      message,
    }),
    [toast, appearanceOpen, message],
  );

  return (
    <UIContext.Provider value={value}>
      {children}
      {renderAppearance(appearanceOpen, value.closeAppearance)}
      <div className={`toast${message ? " on" : ""}`} role="status" aria-live="polite">
        {message}
      </div>
    </UIContext.Provider>
  );
}
