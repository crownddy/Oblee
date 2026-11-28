import type { Metadata } from "next";
import { DiscoverScreen, type SearchParamsRecord } from "@/components/events/DiscoverScreen";
import { canonicalPath, discoveryRobots, isFilteredView } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}): Promise<Metadata> {
  const params = await searchParams;
  // The bare home page is the canonical entry point. A filtered home URL shows a
  // search result that `/explore` already owns, so it is kept out of the index
  // rather than canonicalised to a page it does not represent.
  const filtered = isFilteredView(params);
  return {
    ...(filtered
      ? { robots: discoveryRobots("home", params) }
      : { alternates: { canonical: canonicalPath("/", params) }, openGraph: { url: "/" } }),
  };
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const params = await searchParams;
  return <DiscoverScreen mode="home" searchParams={params} />;
}
