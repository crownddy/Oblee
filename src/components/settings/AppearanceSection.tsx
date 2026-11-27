"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { AppearancePicker } from "@/components/settings/AppearancePicker";
import { Icon } from "@/components/ui/Icon";
import { THEMES } from "@/lib/constants";
import { readStoredMode, watchStoredMode } from "@/lib/theme";

export function AppearanceSection() {
  const [open, setOpen] = useState(false);
  const buttonId = useId();
  const panelId = useId();
  const mode = useSyncExternalStore(watchStoredMode, readStoredMode, () => "");
  const current = THEMES.find((theme) => theme.value === mode) ?? THEMES[0];

  return (
    <div className="card acc">
      <button
        type="button"
        id={buttonId}
        className="acc-head"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="acc-icon" aria-hidden="true">
          <Icon name="sun" size={18} />
        </span>
        <span className="acc-label">
          <b>Appearance</b>
          <small>{current.label}</small>
        </span>
        <span className="acc-chev" aria-hidden="true">
          <Icon name="chevr" size={16} />
        </span>
      </button>

      <div id={panelId} className="acc-panel" role="region" aria-labelledby={buttonId} hidden={!open}>
        <p className="muted" style={{ fontSize: 12.5, margin: "0 0 4px" }}>
          Choose how Oblee looks. This device remembers your pick.
        </p>
        <AppearancePicker />
      </div>
    </div>
  );
}
