import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SaveButton } from "@/components/events/SaveButton";
import { ShareButton } from "@/components/events/ShareButton";
import { ArchiveButton } from "@/components/events/ArchiveButton";
import { ReportButton } from "@/components/events/ReportButton";
import { BookTableButton } from "@/components/events/BookTableButton";
import { MapEmbed } from "@/components/events/MapEmbed";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { getViewer } from "@/lib/auth/session";
import { categoryColor, categoryLabel } from "@/lib/constants";
import { getEventForViewer } from "@/lib/services/events";
import { eventJsonLd, eventMetadata, serializeJsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/supabase/config";
import { JsonLd } from "@/components/seo/JsonLd";
import { coverStyle } from "@/lib/utils/events";
import { contactLink, contactText, directionsUrl, formatEventDate, formatTime } from "@/lib/utils/format";
import { CONTACT_COLORS, CONTACT_ICONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventForViewer(id);
  // A missing, private-without-grant or removed event answers 404 below; the
  // metadata stays neutral so the response never hints that a row exists.
  if (!event) return { title: "Event not found", robots: { index: false, follow: false } };
  return eventMetadata(event);
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventForViewer(id);
  if (!event) notFound();

  const viewer = await getViewer();
  const location = event.city ? `${event.venue}, ${event.city}` : event.venue;
  const structuredData = eventJsonLd(event, siteUrl);
  const hasTables = event.tables.length > 0;
  const hasPricing = event.tickets.length > 0 || hasTables;

  return (
    <div className="page">
      {structuredData ? <JsonLd data={serializeJsonLd(structuredData)} /> : null}
      <div className="body">
        <div className="hero" style={coverStyle(event)}>
          <div className="t">
            <BackButton />
            <span>
              <SaveButton eventId={event.id} saved={event.isSaved} signedIn={Boolean(viewer)} variant="circle" title={event.title} />
              <ShareButton title={event.title} path={`/events/${event.id}`} />
            </span>
          </div>
          <div>
            <span className="tg" style={{ "--t": categoryColor(event.category) } as React.CSSProperties}>
              {categoryLabel(event.category)}
            </span>
            <h1>{event.title}</h1>
          </div>
        </div>

        <div className="sh">
          <div className="row" style={{ marginTop: 0 }}>
            <Icon name="cal" size={18} />
            {formatEventDate(event.startsAt, event.timezone)}, {formatTime(event.startsAt, event.timezone)}
          </div>
          <div className="row">
            <Icon name="pin" size={18} />
            <span style={{ minWidth: 0 }}>{location}</span>
            <a className="dirs" href={directionsUrl(location)} target="_blank" rel="noopener noreferrer">
              Get Directions →
            </a>
          </div>

          <div className="tl">
            <div>
              <i>
                <Icon name="shield" size={18} />
              </i>
              <span>
                Security
                <b>{event.securityNote}</b>
              </span>
            </div>
            <div>
              <i>
                <Icon name="idc" size={18} />
              </i>
              <span>
                Identity
                <b>{event.identityNote}</b>
              </span>
            </div>
          </div>

          {event.tags.length > 0 ? (
            <div className="chips">
              {event.tags.map((tag) => (
                <span className="chip" key={tag}>
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          {hasPricing ? (
            <div className="card">
              <b>Table Reservations</b>
              <div className="chips">
                {event.tickets.length > 0 ? (
                  event.tickets.map((ticket) => (
                    <span className="chip" key={ticket.name}>
                      {ticket.name} ₦{ticket.price.toLocaleString("en-US")}
                    </span>
                  ))
                ) : (
                  <span className="chip">Free</span>
                )}
              </div>
              <div style={{ color: "var(--mute)", fontSize: 12.5, marginTop: 8 }}>
                {hasTables
                  ? event.tables.map((table) => `${table.quantity} × table of ${table.seats}`).join(", ")
                  : "No tables"}
              </div>
              {hasTables ? <BookTableButton /> : null}
            </div>
          ) : null}

          <div className="card">
            <b>RSVP</b>
            {event.contacts.length > 0 ? (
              event.contacts.map((contact) => (
                <a
                  className="btn o"
                  key={`${contact.kind}-${contact.value}`}
                  style={{ width: "100%", marginTop: 10, flex: "none", height: 46 }}
                  href={contactLink(contact)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span style={{ color: CONTACT_COLORS[contact.kind] }}>
                    <Icon name={CONTACT_ICONS[contact.kind]} size={20} />
                  </span>
                  {contact.caption}
                  <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>
                    {contactText(contact)}
                  </span>
                </a>
              ))
            ) : (
              <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                This event has no public contact yet. Save it and check back, or follow the organiser’s updates.
              </p>
            )}
          </div>

          <div className="card">
            <b>Getting there</b>
            <div style={{ marginTop: 8 }}>
              <MapEmbed venue={location} />
            </div>
            <a
              className="btn"
              style={{ width: "100%", marginTop: 10, flex: "none", height: 46 }}
              href={directionsUrl(location)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get directions in Google Maps
            </a>
          </div>

          <div className="fl" style={{ marginTop: 18, fontSize: 15 }}>
            About
          </div>
          <p style={{ color: "var(--mute)", marginTop: 6, fontSize: 13.5 }}>{event.description}</p>

          <p className="muted" style={{ fontSize: 11.5, marginTop: 18 }}>
            Hosted by {event.organiserName ?? "an Oblee organiser"} ·{" "}
            {event.visibility === "private" ? "Private event" : "Public event"}
          </p>

          {event.canReport ? <ReportButton eventId={event.id} reported={event.isReportedByViewer} /> : null}
        </div>
      </div>

      {event.status === "archived" ? (
        <div className="bar">
          <p className="archn" style={{ flex: 1, margin: 0 }}>
            Archived. Only {event.isOwner ? "you" : "the organiser and Oblee admins"} can see this event. It is kept on record and
            can’t be deleted.
          </p>
        </div>
      ) : (
        <div className="bar">
          {event.isOwner ? (
            <>
              <Link className="btn o" style={{ flex: "none", height: 48, padding: "0 16px" }} href={`/events/${event.id}/edit`}>
                <Icon name="edit" size={16} />
                Edit
              </Link>
              <ArchiveButton eventId={event.id} />
            </>
          ) : null}
          <SaveButton eventId={event.id} saved={event.isSaved} signedIn={Boolean(viewer)} variant="bar" title={event.title} />
        </div>
      )}
    </div>
  );
}
