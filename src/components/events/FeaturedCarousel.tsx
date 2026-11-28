"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { categoryColor, categoryLabel } from "@/lib/constants";
import type { EventSummary } from "@/lib/types/domain";
import { coverStyle } from "@/lib/utils/events";
import { carouselDateLabel, formatDateParts, formatTime } from "@/lib/utils/format";

export function FeaturedCarousel({ events }: { events: EventSummary[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const touchStart = useRef<number | null>(null);
  const moved = useRef(false);
  const count = events.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setAnimate(false);
      setIndex(((next % count) + count) % count);
      requestAnimationFrame(() => setAnimate(true));
    },
    [count],
  );

  useEffect(() => {
    if (count < 2) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((current) => (current + 1) % count);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  const current = Math.min(index, count - 1);
  const active = events[current] ?? events[0];
  if (!active) return null;

  const onCardClick = (position: number) => {
    if (moved.current) return;
    if (position === current) {
      router.push(`/events/${active.id}`);
    } else {
      go(position);
    }
  };

  return (
    <div
      className="cz"
      id="bn"
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured events"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(current + 1);
        if (event.key === "ArrowLeft") go(current - 1);
        if (event.key === "Enter" && active) router.push(`/events/${active.id}`);
      }}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
        moved.current = false;
      }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
        if (Math.abs(delta) > 40) {
          moved.current = true;
          go(current + (delta < 0 ? 1 : -1));
          window.setTimeout(() => {
            moved.current = false;
          }, 300);
        }
        touchStart.current = null;
      }}
      onMouseDown={() => {
        moved.current = false;
      }}
    >
      <div className="czt" id="czt">
        {events.map((event, position) => {
          let offset = position - current;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;
          const distance = Math.abs(offset);
          const parts = formatDateParts(event.startsAt, event.timezone);
          return (
            <div
              key={event.id}
              className="czs"
              data-k={position}
              role="group"
              aria-roledescription="slide"
              aria-label={`${event.title}, ${position + 1} of ${count}`}
              aria-hidden={distance > 2}
              style={{
                ...coverStyle(event),
                transform: `translateX(${offset * 58}%) translateZ(${-distance * 90}px) rotateY(${offset * -28}deg) scale(${1 - distance * 0.08})`,
                opacity: distance > 2 ? 0 : 1 - distance * 0.28,
                zIndex: 20 - distance,
                filter: `brightness(${1 - distance * 0.25})`,
                pointerEvents: distance > 2 ? "none" : "auto",
                transition: animate ? undefined : "none",
              }}
              onClick={() => onCardClick(position)}
            >
              <i className="hat" aria-hidden="true" />
              <span className="tg" style={{ "--t": categoryColor(event.category) } as React.CSSProperties}>
                {categoryLabel(event.category)}
              </span>
              <b>{event.startsAt ? parts.day : ""}</b>
              <small>{carouselDateLabel(event.startsAt, event.timezone) === "Tonight" ? "TONIGHT" : parts.month}</small>
            </div>
          );
        })}
      </div>
      <button type="button" className="czb prev" aria-label="Previous event" onClick={() => go(current - 1)}>
        <Icon name="back" size={18} />
      </button>
      <button type="button" className="czb next" aria-label="Next event" onClick={() => go(current + 1)}>
        <Icon name="chevr" size={18} />
      </button>
      <div className="czi f" key={active.id} aria-live="polite">
        <h2>{active.title}</h2>
        <p>
          <Icon name="pin" size={12} /> {active.city ? `${active.venue}, ${active.city}` : active.venue}
        </p>
        <p>
          {carouselDateLabel(active.startsAt, active.timezone)}, {formatTime(active.startsAt, active.timezone)}
        </p>
        <div className="chips">
          {[categoryLabel(active.category), ...active.tags].slice(0, 3).map((tag) => (
            <span className="chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="czd" aria-hidden="true">
        {events.map((event, position) => (
          <i key={event.id} className={position === current ? "on" : ""} />
        ))}
      </div>
    </div>
  );
}
