const HISTORY_KEY = "oblee:nav-history";
const SCROLL_KEY = "oblee:nav-scroll";
const MAX_ENTRIES = 24;

function readHistory(): string[] {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: string[]) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    /* storage can be blocked; back navigation then falls back to route defaults */
  }
}

export type LocationRecord = "push" | "pop" | "stay";

/**
 * Mirrors the browser history with the paths this app visited, so a back control
 * can tell an in-app predecessor from a direct entry (a shared link, a new tab).
 */
export function recordLocation(path: string, options: { popped?: boolean } = {}): LocationRecord {
  const entries = readHistory();

  if (options.popped) {
    const index = entries.lastIndexOf(path);
    if (index >= 0 && index < entries.length - 1) {
      writeHistory(entries.slice(0, index + 1));
      return "pop";
    }
    writeHistory([...entries, path].slice(-MAX_ENTRIES));
    return "push";
  }

  if (entries[entries.length - 1] === path) return "stay";
  writeHistory([...entries, path].slice(-MAX_ENTRIES));
  return "push";
}

/** A fresh document starts a fresh trail; only history from this session counts. */
export function resetHistory(path: string) {
  writeHistory([path]);
}

export function previousLocation(): string | null {
  const entries = readHistory();
  return entries.length > 1 ? (entries[entries.length - 2] ?? null) : null;
}

export function canGoBack(): boolean {
  return previousLocation() !== null;
}

/** Back when there is somewhere to return to, otherwise the route's own sensible destination. */
export function goBackToOrigin(router: { back: () => void; push: (href: string) => void }, fallback: string) {
  if (canGoBack()) {
    router.back();
    return;
  }
  router.push(fallback);
}

function readScrollMap(): Record<string, number> {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? "{}");
    return raw && typeof raw === "object" ? (raw as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function saveScroll(path: string, top: number) {
  try {
    const map = readScrollMap();
    map[path] = Math.max(0, Math.round(top));
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(map));
  } catch {
    /* storage can be blocked; the screen simply reopens at the top */
  }
}

export function readScroll(path: string): number | null {
  const value = readScrollMap()[path];
  return typeof value === "number" ? value : null;
}
