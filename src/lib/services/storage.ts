import { EVENT_IMAGE_BUCKET, SIGNED_IMAGE_URL_TTL } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { eventImagePath } from "@/lib/utils/images";

/**
 * Resolves stored cover values to what the browser may render.
 *
 * Uploaded covers become short-lived signed URLs minted for the current viewer;
 * the storage policy only signs files the viewer may read, so a private event's
 * cover cannot be handed out. External links pass through, and anything that
 * cannot be signed is dropped so the card falls back to its gradient.
 */
export async function resolveEventImages(
  values: Array<string | null | undefined>,
): Promise<Map<string, string | null>> {
  const resolved = new Map<string, string | null>();
  const stored = [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
  if (stored.length === 0) return resolved;

  const paths = [...new Set(stored.map(eventImagePath).filter((path): path is string => Boolean(path)))];
  for (const value of stored) {
    if (!eventImagePath(value)) resolved.set(value, value);
  }
  if (paths.length === 0) return resolved;

  if (!isSupabaseConfigured) {
    for (const path of paths) resolved.set(path, null);
    return resolved;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.storage
      .from(EVENT_IMAGE_BUCKET)
      .createSignedUrls(paths, SIGNED_IMAGE_URL_TTL);

    if (error) console.error("createSignedUrls", error.message);

    const signed = new Map<string, string>();
    (data ?? []).forEach((entry, index) => {
      const path = (entry.path ?? paths[index] ?? "").replace(`${EVENT_IMAGE_BUCKET}/`, "");
      if (entry.signedUrl && !entry.error) signed.set(path, entry.signedUrl);
    });

    for (const path of paths) resolved.set(path, signed.get(path) ?? null);
  } catch (error) {
    console.error("resolveEventImages", error);
    for (const path of paths) resolved.set(path, null);
  }

  return resolved;
}

/** Signs a single cover the caller is about to show (upload preview, edit form). */
export async function signEventImage(stored: string | null | undefined): Promise<string | null> {
  const path = eventImagePath(stored);
  if (!path) return null;
  const resolved = await resolveEventImages([path]);
  return resolved.get(path) ?? null;
}
