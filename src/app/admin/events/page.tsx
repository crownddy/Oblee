import Link from "next/link";
import { FeatureToggle, RemoveEventButton } from "@/components/admin/AdminControls";
import { adminListEvents } from "@/lib/services/admin";
import { formatEventDate } from "@/lib/utils/format";
import { firstParam, type SearchParamsRecord } from "@/lib/utils/searchParams";
import type { EventStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

const STATUSES: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
  { value: "removed", label: "Removed" },
];

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const params = await searchParams;
  const status = firstParam(params.status);
  const validStatus = STATUSES.some((item) => item.value === status) ? status : "";
  const events = await adminListEvents(validStatus ? (validStatus as EventStatus) : undefined);

  return (
    <>
      <div className="seg" style={{ marginTop: 16 }}>
        {STATUSES.map((item) => (
          <Link
            key={item.value || "all"}
            href={item.value ? `/admin/events?status=${item.value}` : "/admin/events"}
            className={validStatus === item.value ? "on" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="sec" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 16 }}>Events</h3>
        <span className="muted" style={{ fontSize: 12 }}>{events.length}</span>
      </div>

      {events.length === 0 ? (
        <p className="muted">No events in this queue.</p>
      ) : (
        <div className="card" style={{ padding: "4px 14px" }}>
          {events.map((event) => (
            <div className="arow" key={event.id}>
              <div className="meta">
                <b>
                  <Link href={`/events/${event.id}`} className="link">
                    {event.title}
                  </Link>
                </b>
                <small>
                  {event.organiserName} · {formatEventDate(event.startsAt, "Africa/Lagos")}
                </small>
                <small>
                  <span className={`badge${event.status === "published" ? " ok" : event.status === "removed" ? " danger" : " warn"}`}>
                    {event.status}
                  </span>
                </small>
              </div>
              <div className="act">
                {event.status === "published" ? <FeatureToggle eventId={event.id} featured={event.isFeatured} /> : null}
                <RemoveEventButton eventId={event.id} removed={event.status === "removed"} />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="note">
        Removing an event sets its status to <code>removed</code> and takes it off featured placement. The row is kept so reports
        can still be investigated.
      </p>
    </>
  );
}
