import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SaveButton } from "@/components/events/SaveButton";
import { categoryColor, categoryLabel } from "@/lib/constants";
import type { EventSummary } from "@/lib/types/domain";
import { coverStyle, priceLabel } from "@/lib/utils/events";
import { formatDateParts, formatTime } from "@/lib/utils/format";

const VISIBLE_TAGS = 2;

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
  const price = priceLabel(event);
  const tags = event.tags.slice(0, VISIBLE_TAGS);
  const hiddenTags = event.tags.length - tags.length;
  const label = [
    event.title,
    `${parts.weekday} ${parts.day} ${parts.month}`,
    location,
    formatTime(event.startsAt, event.timezone),
    price,
    event.organiserName ? `hosted by ${event.organiserName}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="ev" style={{ position: "relative" }}>
      <Link href={href ?? `/events/${event.id}`} className="ev-link" aria-label={label} />
      <div className="db">
        <small>{parts.weekday}</small>
        <b>{parts.day}</b>
        <small>{parts.month}</small>
      </div>
      <div className="pc" style={coverStyle(event)}>
        <div className="ev-top">
          <span className="tg" style={{ "--t": categoryColor(event.category) } as React.CSSProperties}>
            {categoryLabel(event.category)}
          </span>
          {price ? <span className={`pb${event.isFree ? " free" : ""}`}>{price}</span> : null}
        </div>
        <SaveButton eventId={event.id} saved={event.isSaved} signedIn={signedIn} title={event.title} />
        <h4>{event.title}</h4>
        <p>
          <Icon name="pin" size={11} />
          {location}, {formatTime(event.startsAt, event.timezone)}
        </p>
        {event.organiserName || tags.length > 0 ? (
          <div className="ev-foot">
            {event.organiserName ? <span className="ev-org">{event.organiserName}</span> : null}
            {tags.map((tag) => (
              <span className="ev-tag" key={tag}>
                {tag}
              </span>
            ))}
            {hiddenTags > 0 ? <span className="ev-tag more">+{hiddenTags}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
