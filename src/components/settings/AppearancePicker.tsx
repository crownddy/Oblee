"use client";

import { useSyncExternalStore } from "react";
import { THEMES } from "@/lib/constants";
import { readStoredMode, setStoredMode, watchStoredMode } from "@/lib/theme";
import { useUI } from "@/components/ui/UIProvider";

export function AppearancePicker() {
  const mode = useSyncExternalStore(watchStoredMode, readStoredMode, () => "");
  const { toast } = useUI();

  const choose = (value: (typeof THEMES)[number]["value"], label: string) => {
    setStoredMode(value);
    toast(`${label} is on.`);
  };

  return (
    <div>
      {THEMES.map((theme) => (
        <button
          key={theme.value || "classic"}
          type="button"
          className={`opt${mode === theme.value ? " on" : ""}`}
          onClick={() => choose(theme.value, theme.label)}
          aria-pressed={mode === theme.value}
        >
          <i style={{ background: theme.swatch }} aria-hidden="true" />
          <span>
            <b>{theme.label}</b>
            <small>{theme.description}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
