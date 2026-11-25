import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <div className="page">
      <div className="body">
        <div className="pad" style={{ paddingTop: 64 }}>
          <EmptyState
            title="This page has left the party"
            body="The event may have been archived or the address is wrong."
            action={{ href: "/", label: "Back to discovery" }}
          />
          <p className="muted" style={{ textAlign: "center", fontSize: 12 }}>
            Looking for your events?{" "}
            <Link className="link" href="/profile">
              Open your profile
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
