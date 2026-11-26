"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface UIContextValue {
  toast: (message: string) => void;
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

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback(
    (next: string) => {
      setMessage(next);
      if (timer) clearTimeout(timer);
      setTimer(setTimeout(() => setMessage(null), 2800));
    },
    [timer],
  );

  const value = useMemo<UIContextValue>(() => ({ toast, message }), [toast, message]);

  return (
    <UIContext.Provider value={value}>
      {children}
      <div className={`toast${message ? " on" : ""}`} role="status" aria-live="polite">
        {message}
      </div>
    </UIContext.Provider>
  );
}
