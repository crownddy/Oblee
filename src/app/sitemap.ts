import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/seo";
import { listSitemapEvents } from "@/lib/services/events";
import { siteUrl } from "@/lib/supabase/config";

// Events change during the day; an hourly rebuild keeps the file honest without
// querying the database on every request.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let events: Array<{ id: string; updatedAt: string | null }> = [];
  try {
    events = await listSitemapEvents();
  } catch (error) {
    // A database hiccup must not serve a broken sitemap; the static pages still do.
    console.error("sitemap", error instanceof Error ? error.message : error);
  }
  return buildSitemapEntries(siteUrl, events);
}
