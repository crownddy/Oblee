import { DiscoverScreen, type SearchParamsRecord } from "@/components/events/DiscoverScreen";

export const dynamic = "force-dynamic";

export const metadata = { title: "Explore events" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const params = await searchParams;
  return <DiscoverScreen mode="explore" searchParams={params} />;
}
