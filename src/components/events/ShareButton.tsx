"use client";

import { Icon } from "@/components/ui/Icon";
import { useUI } from "@/components/ui/UIProvider";

export function ShareButton({ title, path }: { title: string; path: string }) {
  const { toast } = useUI();

  const share = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text: `${title} on Oblee`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("Link copied. Send it to your people.");
    } catch {
      toast("Could not share this event. Copy the address from your browser.");
    }
  };

  return (
    <button className="cir" type="button" aria-label="Share event" onClick={share}>
      <Icon name="share" size={18} />
    </button>
  );
}
