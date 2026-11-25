"use client";

import { useSyncExternalStore } from "react";
import { THEMES, type ThemeValue } from "@/lib/constants";
import { Icon } from "@/components/ui/Icon";
import { useUI } from "@/components/ui/UIProvider";

const PREF_KEY = "oblee-prefs";
const PREF_EVENT = "oblee:prefs";

function readMode(): ThemeValue {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREF_KEY) ?? "null") as { mode?: string } | null;
    const mode = prefs?.mode ?? localStorage.getItem("oblee-mode") ?? "";
    return THEMES.some((theme) => theme.value === mode) ? (mode as ThemeValue) : "";
  } catch {
    return "";
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PREF_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PREF_EVENT, callback);
  };
}

/** Reads the persisted theme without a setState-in-effect round trip. */
function useStoredMode(): ThemeValue {
  return useSyncExternalStore(subscribe, readMode, () => "");
}

export function AppearanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mode = useStoredMode();
  const { toast } = useUI();

  if (!open) return null;

  const choose = (value: ThemeValue, label: string) => {
    if (value) {
      document.documentElement.setAttribute("data-mode", value);
    } else {
      document.documentElement.removeAttribute("data-mode");
    }
    try {
      const prefs = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}") as Record<string, unknown>;
      localStorage.setItem(PREF_KEY, JSON.stringify({ ...prefs, mode: value }));
    } catch {
      /* storage can be blocked; the theme still applies for this page */
    }
    window.dispatchEvent(new Event(PREF_EVENT));
    onClose();
    toast(`${label} is on.`);
  };

  return (
    <div className="ovl on" id="mo" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="msh" id="ms" role="dialog" aria-modal="true" aria-label="Appearance">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3>Appearance</h3>
          <button type="button" onClick={onClose} aria-label="Close appearance">
            <Icon name="close" size={20} />
          </button>
        </div>
        <p className="sub" style={{ margin: "2px 0 0" }}>
          Choose how Oblee looks.
        </p>
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
    </div>
  );
}

/** Applies the stored theme before first paint and skips a repeat splash. */
export function ThemeScript() {
  const script = `
(function(){try{
  var prefs=JSON.parse(localStorage.getItem('${PREF_KEY}')||'null')||{};
  var mode=prefs.mode!==undefined?prefs.mode:(localStorage.getItem('oblee-mode')||'');
  var allowed=['','dark','glass','min','vibe','xmas'];
  if(allowed.indexOf(mode)>-1&&mode){document.documentElement.setAttribute('data-mode',mode);}
  if(sessionStorage.getItem('oblee-splash')==='1'){document.documentElement.setAttribute('data-splash','seen');}
}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
