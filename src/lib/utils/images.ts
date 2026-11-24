import { EVENT_IMAGE_BUCKET } from "@/lib/constants";

const PUBLIC_OBJECT_MARKER = `/storage/v1/object/public/${EVENT_IMAGE_BUCKET}/`;
const OBJECT_PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]+$/i;

/**
 * Object path of an uploaded cover, or null when the stored value is an external
 * link (or empty). The bucket is private, so only paths can be signed.
 */
export function eventImagePath(stored: string | null | undefined): string | null {
  const value = (stored ?? "").trim();
  if (!value) return null;
  if (value.includes(PUBLIC_OBJECT_MARKER)) {
    const path = value.split(PUBLIC_OBJECT_MARKER)[1]?.split("?")[0] ?? "";
    return OBJECT_PATH.test(path) ? path : null;
  }
  return OBJECT_PATH.test(value) ? value : null;
}

/** True when the path sits in the given user's own storage folder. */
export function isOwnedEventImagePath(path: string | null | undefined, userId: string | null | undefined): boolean {
  if (!path || !userId) return false;
  const [folder, file, ...rest] = path.split("/");
  return folder === userId && Boolean(file) && rest.length === 0;
}

/** Source the UI should render for a stored cover. */
export function eventImageSource(
  stored: string | null | undefined,
  signedUrl: string | null | undefined,
): string | null {
  if (!stored) return null;
  if (eventImagePath(stored)) return signedUrl ?? null;
  return stored;
}
