"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useUI } from "@/components/ui/UIProvider";
import { promoteToOrganiserAction } from "@/lib/actions/events";

export function PromoteButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useUI();

  return (
    <button
      type="button"
      className="btn full"
      style={{ height: 46, marginTop: 12 }}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await promoteToOrganiserAction();
          if (!result.ok) {
            toast(result.error);
            return;
          }
          toast("You can now post events on Oblee.");
          router.refresh();
        })
      }
    >
      {pending ? <span className="spin2" /> : <Icon name="star" size={17} />}
      {pending ? "Upgrading…" : "Become an organiser"}
    </button>
  );
}
