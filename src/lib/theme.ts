import { THEMES, type ThemeValue } from "@/lib/constants";

export const THEME_PREF_KEY = "oblee-prefs";
export const THEME_PREF_EVENT = "oblee:prefs";

/** Persisted theme, or "" for the default look. Unknown values fall back to the default. */
export function readStoredMode(): ThemeValue {
  try {
    const prefs = JSON.parse(localStorage.getItem(THEME_PREF_KEY) ?? "null") as { mode?: string } | null;
    const mode = prefs?.mode ?? localStorage.getItem("oblee-mode") ?? "";
    return THEMES.some((theme) => theme.value === mode) ? (mode as ThemeValue) : "";
  } catch {
    return "";
  }
}

export function watchStoredMode(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_PREF_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_PREF_EVENT, callback);
  };
}

export function setStoredMode(value: ThemeValue): void {
  if (value) {
    document.documentElement.setAttribute("data-mode", value);
  } else {
    document.documentElement.removeAttribute("data-mode");
  }
  try {
    const prefs = JSON.parse(localStorage.getItem(THEME_PREF_KEY) ?? "{}") as Record<string, unknown>;
    localStorage.setItem(THEME_PREF_KEY, JSON.stringify({ ...prefs, mode: value }));
  } catch {
    /* storage can be blocked; the theme still applies for this page */
  }
  window.dispatchEvent(new Event(THEME_PREF_EVENT));
}
