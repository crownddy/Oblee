import { DiscoverScreen, type SearchParamsRecord } from "@/components/events/DiscoverScreen";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const params = await searchParams;
  return <DiscoverScreen mode="home" searchParams={params} />;
}
