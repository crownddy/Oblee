import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfigNotice } from "@/components/ui/ConfigNotice";
import { requireUser } from "@/lib/auth/session";
import { listSavedEvents } from "@/lib/services/events";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { pluralize } from "@/lib/utils/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved events" };

export default async function SavedPage() {
  const viewer = await requireUser("/saved");
  const events = isSupabaseConfigured ? await listSavedEvents(viewer) : [];

  return (
    <div className="page">
      <SiteHeader signedIn displayName={viewer.profile?.fullName} />
      <div className="body">
        <div className="pad">
          <div className="sec" style={{ marginTop: 4 }}>
            <h3>Saved events</h3>
            <span className="muted" style={{ fontSize: 12 }}>
              {pluralize(events.length, "event")}
            </span>
          </div>
          {events.length > 0 ? (
            events.map((event) => <EventCard key={event.id} event={event} signedIn />)
          ) : (
            <EmptyState
              title="Nothing saved yet"
              body="Tap the bookmark on an event to keep it here."
              action={{ href: "/explore", label: "Explore events" }}
            />
          )}
          {!isSupabaseConfigured ? (
            <ConfigNotice
              title="Saving needs Supabase"
              intro="Saved events are stored per account. Add your Supabase keys to switch saving on."
              compact
            />
          ) : null}
          <p className="muted" style={{ fontSize: 12, marginTop: 18, textAlign: "center" }}>
            <Link href="/profile" className="link">
              Back to your profile
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
