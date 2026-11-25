import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SaveButton } from "@/components/events/SaveButton";
import { categoryColor, categoryLabel } from "@/lib/constants";
import type { EventSummary } from "@/lib/types/domain";
import { coverStyle } from "@/lib/utils/events";
import { formatDateParts, formatTime } from "@/lib/utils/format";

export function EventCard({
  event,
  signedIn,
  href,
}: {
  event: EventSummary;
  signedIn: boolean;
  href?: string;
}) {
  const parts = formatDateParts(event.startsAt, event.timezone);
  const location = event.city ? `${event.venue}, ${event.city}` : event.venue;

  return (
    <div className="ev" style={{ position: "relative" }}>
      <Link
        href={href ?? `/events/${event.id}`}
        className="ev-link"
        aria-label={`${event.title}, ${parts.weekday} ${parts.day} ${parts.month}, ${location}`}
      />
      <div className="db">
        <small>{parts.weekday}</small>
        <b>{parts.day}</b>
        <small>{parts.month}</small>
      </div>
      <div className="pc" style={coverStyle(event)}>
        <span className="tg" style={{ "--t": categoryColor(event.category) } as React.CSSProperties}>
          {categoryLabel(event.category)}
        </span>
        <SaveButton eventId={event.id} saved={event.isSaved} signedIn={signedIn} title={event.title} />
        <h4>{event.title}</h4>
        <p>
          <Icon name="pin" size={11} />
          {location}, {formatTime(event.startsAt, event.timezone)}
        </p>
      </div>
    </div>
  );
}
