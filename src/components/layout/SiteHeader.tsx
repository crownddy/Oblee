import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/utils/format";

export function SiteHeader({
  signedIn,
  displayName,
}: {
  signedIn: boolean;
  displayName?: string | null;
}) {
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
      <Link
        className="av"
        id="av"
        href={signedIn ? "/profile" : "/login"}
        aria-label={signedIn ? `Your profile, signed in as ${displayName ?? "you"}` : "Log in or register"}
      >
        {signedIn && displayName ? initials(displayName) : <Icon name="user" size={18} />}
      </Link>
    </div>
  );
}
