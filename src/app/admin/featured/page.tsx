import Link from "next/link";
import { FeatureEventForm, FeatureToggle } from "@/components/admin/AdminControls";
import { adminListFeatured, adminListPublishedForFeature } from "@/lib/services/admin";
import { formatEventDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AdminFeaturedPage() {
  const [featured, published] = await Promise.all([adminListFeatured(), adminListPublishedForFeature()]);
  const featuredIds = new Set(featured.map((item) => item.eventId));
  const options = published.filter((event) => !featuredIds.has(event.id));

  return (
    <>
      <div className="sec" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 16 }}>Featured events</h3>
        <span className="muted" style={{ fontSize: 12 }}>{featured.length} on the carousel</span>
      </div>

      {featured.length === 0 ? (
        <p className="muted">Nothing is featured yet.</p>
      ) : (
        <div className="card" style={{ padding: "4px 14px" }}>
          {featured.map((item) => (
            <div className="arow" key={item.eventId}>
              <div className="meta">
                <b>
                  <Link href={`/events/${item.eventId}`} className="link">
                    {item.title}
                  </Link>
                </b>
                <small>
                  Rank {item.rank} · {formatEventDate(item.startsAt, "Africa/Lagos")} · {item.status}
                </small>
              </div>
              <div className="act">
                <FeatureToggle eventId={item.eventId} featured />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <FeatureEventForm options={options} />
      </div>

      <p className="note">
        Featured placement lives in its own table. Organisers cannot write to it: the only write path is the admin-only
        <code> set_event_featured</code> function.
      </p>
    </>
  );
}
