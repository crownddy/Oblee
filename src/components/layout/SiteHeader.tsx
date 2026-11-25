"use client";

import { useUI } from "@/components/ui/UIProvider";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/utils/format";

export function SiteHeader({
  signedIn,
  displayName,
}: {
  signedIn: boolean;
  displayName?: string | null;
}) {
  const { openAppearance } = useUI();

  return (
    <div className="hdr fx">
      <div className="logo">
        <i className="hat" aria-hidden="true" />
        <img src="/brand/mark.png" alt="" width={33} height={40} />
        <div>
          <img className="wordmark-on-light" src="/brand/wordmark.png" alt="Oblee" style={{ display: "block", height: 26, width: "auto" }} />
          <img className="wordmark-on-dark" src="/brand/wordmark-white.png" alt="Oblee" style={{ height: 26, width: "auto" }} />
          <small>find the party you love</small>
        </div>
      </div>
      <button
        className="av"
        id="av"
        type="button"
        aria-haspopup="dialog"
        aria-label={signedIn ? `Profile and appearance, signed in as ${displayName ?? "you"}` : "Appearance, not signed in"}
        onClick={openAppearance}
      >
        {signedIn && displayName ? initials(displayName) : <Icon name="user" size={18} />}
      </button>
    </div>
  );
}
