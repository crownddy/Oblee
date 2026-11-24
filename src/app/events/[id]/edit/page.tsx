import { notFound, redirect } from "next/navigation";
import { EventWizard, type WizardInitial } from "@/components/organiser/EventWizard";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireVerifiedAdult } from "@/lib/auth/session";
import { getEventForViewer } from "@/lib/services/events";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { fromInstant } from "@/lib/utils/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireVerifiedAdult(`/events/${id}/edit`);
  const event = await getEventForViewer(id);
  if (!event) notFound();

  const isAdmin = viewer.profile?.role === "admin";
  if (!event.isOwner && !isAdmin) {
    redirect(`/events/${id}`);
  }

  if (event.status === "removed") {
    return (
      <div className="page">
        <PageHeader title="Edit Event" backHref={`/events/${id}`} />
        <div className="body cb">
          <div className="archn">This event was removed by Oblee and can no longer be edited.</div>
        </div>
      </div>
    );
  }

  const timezone = event.timezone || DEFAULT_TIMEZONE;
  const { date, time } = fromInstant(event.startsAt, timezone);

  const initial: WizardInitial = {
    title: event.title,
    category: event.category,
    visibility: event.visibility,
    date,
    time,
    venue: event.venue,
    city: event.city ?? "",
    description: event.description,
    securityNote: event.securityNote,
    identityNote: event.identityNote,
    tags: event.tags,
    colorFrom: event.colorFrom,
    colorTo: event.colorTo,
    heroImageUrl: event.heroImagePath ?? event.heroImageUrl,
    heroImagePreview: event.heroImagePath ? event.heroImageUrl : null,
    tickets: event.tickets,
    tables: event.tables,
    contacts: event.contacts,
  };

  return <EventWizard mode="edit" eventId={event.id} initial={initial} />;
}
