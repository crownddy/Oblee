"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/ui/UIProvider";
import { removeEventAction, setFeaturedAction, setReportStatusAction, setUserRoleAction } from "@/lib/actions/admin";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import type { UserRole } from "@/lib/types/domain";

export function UserRoleControl({ userId, role, isSelf }: { userId: string; role: UserRole; isSelf: boolean }) {
  const [value, setValue] = useState<UserRole>(role);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useUI();

  const save = () => {
    startTransition(async () => {
      const result = await setUserRoleAction(userId, value);
      if (!result.ok) {
        toast(result.error);
        return;
      }
      toast("Role updated.");
      router.refresh();
    });
  };

  return (
    <div className="act">
      <select
        className="in"
        style={{ width: 116, height: 34, padding: "0 8px", fontSize: 12 }}
        value={value}
        aria-label="User role"
        disabled={isSelf || pending}
        onChange={(event) => setValue(event.target.value as UserRole)}
      >
        <option value="attendee">Attendee</option>
        <option value="organiser">Organiser</option>
        <option value="admin">Admin</option>
      </select>
      <button type="button" onClick={save} disabled={isSelf || pending || value === role}>
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

export function FeatureToggle({ eventId, featured }: { eventId: string; featured: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useUI();

  return (
    <button
      type="button"
      aria-pressed={featured}
      disabled={pending}
      style={featured ? { color: "var(--pri)", borderColor: "var(--pri)" } : undefined}
      onClick={() =>
        startTransition(async () => {
          const result = await setFeaturedAction(eventId, !featured);
          if (!result.ok) {
            toast(result.error);
            return;
          }
          toast(featured ? "Removed from featured." : "Featured on the home carousel.");
          router.refresh();
        })
      }
    >
      <Icon name="star" size={13} filled={featured} /> {featured ? "Featured" : "Feature"}
    </button>
  );
}

export function RemoveEventButton({ eventId, removed }: { eventId: string; removed: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useUI();

  if (removed) {
    return <span className="badge danger">Removed</span>;
  }

  return (
    <button
      type="button"
      className={cn("danger")}
      disabled={pending}
      onClick={() => {
        if (!confirming) {
          setConfirming(true);
          window.setTimeout(() => setConfirming(false), 4000);
          return;
        }
        startTransition(async () => {
          const result = await removeEventAction(eventId);
          if (!result.ok) {
            toast(result.error);
            return;
          }
          toast("Event removed from Oblee.");
          router.refresh();
        });
      }}
    >
      {pending ? "Removing…" : confirming ? "Confirm remove" : "Remove"}
    </button>
  );
}

export function ReportActions({ reportId, status }: { reportId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useUI();

  const update = (next: "reviewing" | "resolved" | "dismissed") =>
    startTransition(async () => {
      const result = await setReportStatusAction(reportId, next);
      if (!result.ok) {
        toast(result.error);
        return;
      }
      toast(`Report ${next}.`);
      router.refresh();
    });

  return (
    <div className="act">
      {status !== "reviewing" ? (
        <button type="button" disabled={pending} onClick={() => update("reviewing")}>
          Reviewing
        </button>
      ) : null}
      {status !== "resolved" ? (
        <button type="button" disabled={pending} onClick={() => update("resolved")}>
          Resolve
        </button>
      ) : null}
      {status !== "dismissed" ? (
        <button type="button" className="danger" disabled={pending} onClick={() => update("dismissed")}>
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

export function FeatureEventForm({ options }: { options: Array<{ id: string; title: string }> }) {
  const [eventId, setEventId] = useState(options[0]?.id ?? "");
  const [rank, setRank] = useState("0");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useUI();

  if (options.length === 0) {
    return <p className="muted">Publish an event first, then feature it here.</p>;
  }

  return (
    <form
      className="card"
      onSubmit={(event) => {
        event.preventDefault();
        if (!eventId) return;
        startTransition(async () => {
          const result = await setFeaturedAction(eventId, true, Number(rank) || 0);
          if (!result.ok) {
            toast(result.error);
            return;
          }
          toast("Featured on the home carousel.");
          router.refresh();
        });
      }}
    >
      <b>Feature an event</b>
      <label className="fl">
        Event
        <select className="in" value={eventId} onChange={(event) => setEventId(event.target.value)} disabled={pending}>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
      </label>
      <label className="fl">
        Position
        <input
          className="in"
          type="number"
          min={0}
          max={20}
          value={rank}
          onChange={(event) => setRank(event.target.value)}
          disabled={pending}
        />
      </label>
      <button className="btn full" type="submit" disabled={pending} style={{ marginTop: 12 }}>
        {pending ? "Saving…" : "Feature event"}
      </button>
    </form>
  );
}
