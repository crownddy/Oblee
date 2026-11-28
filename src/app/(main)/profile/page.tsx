import Link from "next/link";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { PromoteButton } from "@/components/profile/PromoteButton";
import { requireUser } from "@/lib/auth/session";
import { listEventsForOrganiser } from "@/lib/services/events";
import { getMyAgeStatus, needsAgeVerification } from "@/lib/services/age";
import { initials, pluralize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your profile",
  robots: PRIVATE_ROBOTS,
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const tab = first(params.tab) === "archived" ? "archived" : "mine";
  const notice = first(params.notice);

  const viewer = await requireUser("/profile");
  const profile = viewer.profile;
  const canPublish = profile?.role === "organiser" || profile?.role === "admin";
  const events = canPublish && profile ? await listEventsForOrganiser(profile.id, { archived: tab === "archived" }) : [];
  const needsVerify = canPublish && needsAgeVerification(await getMyAgeStatus());

  return (
    <div className="page">
      <SiteHeader signedIn displayName={profile?.fullName} />
      <div className="body">
        <div className="pad">
          {notice === "admin-only" ? (
            <p className="archn" style={{ marginBottom: 12 }}>
              That area is for Oblee administrators.
            </p>
          ) : null}

          <div className="pf">
            <span className="av2">{initials(profile?.fullName ?? viewer.email)}</span>
            <div style={{ minWidth: 0 }}>
              <b>{profile?.fullName || "Oblee member"}</b>
              <small style={{ display: "block", overflowWrap: "anywhere" }}>
                {viewer.email}
              </small>
              <span className="badge" style={{ marginTop: 4 }}>
                {profile?.role ?? "attendee"}
              </span>
            </div>
          </div>

          {profile?.role === "admin" ? (
            <Link className="btn o full" href="/admin" style={{ height: 46, marginBottom: 12 }}>
              <Icon name="shield" size={17} /> Admin dashboard
            </Link>
          ) : null}

          {needsVerify ? (
            <div className="card" style={{ marginTop: 0, borderColor: "var(--pri)" }}>
              <b>Verify your age to publish</b>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                Your account was created before Oblee asked for a date of birth. Add it once and your events go live
                straight away. We never ask for an ID.
              </p>
              <Link className="btn full" href="/verify-age?next=%2Fevents%2Fnew" style={{ marginTop: 10 }}>
                <Icon name="shield" size={17} /> Verify my age
              </Link>
            </div>
          ) : null}

          {profile?.role === "attendee" ? (
            <div className="card" style={{ marginTop: 0 }}>
              <b>Host your own party</b>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                Upgrade your account to an organiser to post events, manage contacts and archive your listings.
              </p>
              <PromoteButton />
            </div>
          ) : null}

          <div className="seg" style={{ marginTop: 12 }}>
            <Link href="/profile" className={cn(tab === "mine" && "on")}>
              Your events
            </Link>
            <Link href="/profile?tab=archived" className={cn(tab === "archived" && "on")}>
              Archived
            </Link>
          </div>

          <div className="sec" style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16 }}>{tab === "archived" ? "Archived events" : "Your events"}</h3>
            <span className="muted" style={{ fontSize: 12 }}>
              {pluralize(events.length, "event")}
            </span>
          </div>

          {tab === "archived" && events.length > 0 ? (
            <p className="note" style={{ marginTop: 0 }}>
              Archived events are hidden from search. Only you can see them.
            </p>
          ) : null}

          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id}>
                {tab === "archived" ? (
                  <span className="badge warn" style={{ marginBottom: 4, display: "inline-block" }}>
                    Archived
                  </span>
                ) : null}
                <EventCard event={event} signedIn href={`/events/${event.id}`} />
              </div>
            ))
          ) : canPublish ? (
            <EmptyState
              title={tab === "archived" ? "No archived events" : "No events posted yet"}
              body={
                tab === "archived"
                  ? "Events you archive are kept here. Only you can see them."
                  : "Post your first party and it will show up here."
              }
              action={tab === "archived" ? undefined : { href: "/events/new", label: "Post an event" }}
            />
          ) : (
            <EmptyState
              title="No events posted yet"
              body="Become an organiser to post and manage events on Oblee."
            />
          )}
        </div>
      </div>
    </div>
  );
}
