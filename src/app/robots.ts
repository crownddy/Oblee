import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/supabase/config";

/**
 * Crawling is open for the public catalogue. Everything behind a sign-in is
 * disallowed, and the private pages also send `noindex` in their own metadata.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/settings", "/saved", "/profile", "/auth/", "/events/*/edit"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
