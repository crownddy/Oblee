import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DiscoverFilters } from "@/components/events/DiscoverFilters";
import { EventCard } from "@/components/events/EventCard";
import { FeaturedCarousel } from "@/components/events/FeaturedCarousel";
import { Pager } from "@/components/events/Pager";
import { EmptyState } from "@/components/ui/EmptyState";
import { getViewer } from "@/lib/auth/session";
import { listFeaturedEvents, listPublishedEvents } from "@/lib/services/events";
import { normaliseCategoryParam, normaliseDateParam } from "@/lib/utils/discovery";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export async function DiscoverScreen({
  mode,
  searchParams,
}: {
  mode: "home" | "explore";
  searchParams: SearchParamsRecord;
}) {
  const query = first(searchParams.q).slice(0, 80);
  const category = normaliseCategoryParam(first(searchParams.cat));
  const date = normaliseDateParam(first(searchParams.date));
  const page = Math.max(1, Number.parseInt(first(searchParams.page), 10) || 1);
  const path = mode === "home" ? "/" : "/explore";

  const viewer = await getViewer();
  const [result, featured] = await Promise.all([
    listPublishedEvents({ query, category, date, page }),
    listFeaturedEvents(),
  ]);

  const showCarousel = mode === "home" && !query && !date && featured.length > 0;
  const hasFilters = Boolean(query || category || date);

  return (
    <div className="page">
      <SiteHeader signedIn={Boolean(viewer)} displayName={viewer?.profile?.fullName} />
      <div className="body">
        <div className="pad">
          <DiscoverFilters path={path} initialQuery={query} category={category} date={date} />

          {showCarousel ? <FeaturedCarousel events={featured} /> : null}

          <div className="sec">
            <h3>{result.events.length === 0 ? (mode === "home" ? "Upcoming Events" : "Explore events") : mode === "home" ? "Upcoming Events" : "Explore events"}</h3>
            {mode === "home" ? (
              <Link href="/explore">See all</Link>
            ) : hasFilters ? (
              <Link href="/explore">Clear filters</Link>
            ) : null}
          </div>

          {result.events.length > 0 ? (
            <div>
              {result.events.map((event) => (
                <EventCard key={event.id} event={event} signedIn={Boolean(viewer)} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={hasFilters ? "No event matches" : "No events on Oblee yet"}
              body={
                hasFilters
                  ? "Try another date, place or category."
                  : "New parties are posted every week. Check back soon, or post your own."
              }
              action={hasFilters ? undefined : { href: "/events/new", label: "Post an event" }}
            />
          )}

          <Pager
            total={result.total}
            page={result.page}
            pageCount={result.pageCount}
            query={query}
            category={category}
            date={date}
            path={path}
          />
        </div>
      </div>
    </div>
  );
}
