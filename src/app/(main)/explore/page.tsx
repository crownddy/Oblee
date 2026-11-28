import type { Metadata } from "next";
import { DiscoverScreen, type SearchParamsRecord } from "@/components/events/DiscoverScreen";
import { canonicalPath, discoveryRobots } from "@/lib/seo";

export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Search African parties, concerts, festivals and owambe by category and date, then save the ones you like on Oblee.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: "Explore events",
    description: DESCRIPTION,
    // Filters are part of the product, so each view keeps its own canonical;
    // tracking parameters are dropped rather than the whole query.
    alternates: { canonical: canonicalPath("/explore", params) },
    robots: discoveryRobots("explore", params),
    openGraph: { title: "Explore events", description: DESCRIPTION, url: "/explore" },
  };
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const params = await searchParams;
  return <DiscoverScreen mode="explore" searchParams={params} />;
}
