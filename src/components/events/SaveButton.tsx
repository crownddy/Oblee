"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useUI } from "@/components/ui/UIProvider";
import { toggleSaveAction } from "@/lib/actions/events";
import { CONFIG_REQUIRED_MESSAGE, isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils/cn";

interface SaveButtonProps {
  eventId: string;
  saved: boolean;
  signedIn: boolean;
  variant?: "card" | "circle" | "bar";
  title?: string;
}

export function SaveButton({ eventId, saved, signedIn, variant = "card", title }: SaveButtonProps) {
  const [isSaved, setIsSaved] = useState(saved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useUI();

  const label = isSaved ? `Remove ${title ?? "event"} from saved` : `Save ${title ?? "event"}`;

  const onClick = () => {
    if (!isSupabaseConfigured) {
      toast(CONFIG_REQUIRED_MESSAGE);
      return;
    }
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !isSaved;
    setIsSaved(next);
    startTransition(async () => {
      const result = await toggleSaveAction(eventId, next);
      if (!result.ok) {
        setIsSaved(!next);
        toast(result.error);
        return;
      }
      toast(next ? "Saved to your list." : "Removed from saved.");
      router.refresh();
    });
  };

  if (variant === "bar") {
    return (
      <button type="button" className="btn sm" onClick={onClick} aria-pressed={isSaved} disabled={pending}>
        <Icon name="bm" size={17} filled />
        {isSaved ? "Saved" : "Save"}
      </button>
    );
  }

  if (variant === "circle") {
    return (
      <button
        type="button"
        className="cir"
        onClick={onClick}
        aria-label={label}
        aria-pressed={isSaved}
        disabled={pending}
        style={isSaved ? { color: "var(--pri)" } : undefined}
      >
        <Icon name="bm" size={17} filled />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn("bm", isSaved && "on")}
      onClick={onClick}
      aria-label={label}
      aria-pressed={isSaved}
      disabled={pending}
    >
      <Icon name="bm" size={15} filled />
    </button>
  );
}
