import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { PromoteButton } from "@/components/profile/PromoteButton";
import { EventWizard } from "@/components/organiser/EventWizard";
import { canPublish, requireVerifiedAdult } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create a new event" };

export default async function NewEventPage() {
  if (!isSupabaseConfigured) {
    return <EventWizard mode="create" preview />;
  }

  const viewer = await requireVerifiedAdult("/events/new");

  if (!canPublish(viewer.profile)) {
    return (
      <div className="page">
        <PageHeader title="Create New Event" backHref="/" />
        <div className="body cb">
          <h2>Become an organiser</h2>
          <p className="sub">Event publishing is available to organiser accounts. Your attendee account keeps its saved events.</p>
          <div className="card" style={{ marginTop: 0 }}>
            <b>Upgrade your account</b>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
              Organisers can post events, upload covers, manage RSVP contacts and archive listings.
            </p>
            <PromoteButton />
          </div>
          <p className="note">
            Prefer to keep browsing?{" "}
            <Link href="/" className="link">
              Back to discovery
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return <EventWizard mode="create" />;
}
