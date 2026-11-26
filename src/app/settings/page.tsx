import Link from "next/link";
import pkg from "../../../package.json";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AppearancePicker } from "@/components/settings/AppearancePicker";
import { Icon } from "@/components/ui/Icon";
import { getViewer } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();

  return (
    <div className="page">
      <SiteHeader signedIn={Boolean(viewer)} displayName={viewer?.profile?.fullName} />
      <div className="body">
        <div className="pad">
          <div className="sec" style={{ marginTop: 0 }}>
            <h3>Settings</h3>
          </div>

          <div className="card" style={{ marginTop: 0 }}>
            <b style={{ fontSize: 14 }}>Appearance</b>
            <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 0" }}>
              Choose how Oblee looks. This device remembers your pick.
            </p>
            <AppearancePicker />
          </div>

          <div className="sec">
            <h3>Notifications</h3>
          </div>
          <div className="card" style={{ marginTop: 0 }}>
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
              Oblee does not send notifications yet. Event reminders and messages from organisers will appear here
              once they exist.
            </p>
          </div>

          <div className="sec">
            <h3>Privacy &amp; safety</h3>
          </div>
          <Link className="opt" href="/privacy" style={{ marginTop: 0 }}>
            <span>
              <b>Privacy policy</b>
              <small>What Oblee stores, and what we never ask for</small>
            </span>
            <Icon name="chevr" size={16} style={{ marginLeft: "auto" }} />
          </Link>

          <div className="sec">
            <h3>Terms of service</h3>
          </div>
          <Link className="opt" href="/terms" style={{ marginTop: 0 }}>
            <span>
              <b>Terms of service</b>
              <small>How Oblee works for attendees and organisers</small>
            </span>
            <Icon name="chevr" size={16} style={{ marginLeft: "auto" }} />
          </Link>

          <div className="sec">
            <h3>About Oblee</h3>
          </div>
          <div className="card" style={{ marginTop: 0 }}>
            <b style={{ fontSize: 14 }}>Find the party you love.</b>
            <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 0" }}>
              Oblee is an African event and party discovery platform. Attendees find events, save favourites and see
              where to enjoy them. Organisers publish and manage their own events.
            </p>
          </div>

          <div className="sec">
            <h3>App version</h3>
          </div>
          <div
            className="card"
            style={{ marginTop: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <b style={{ fontSize: 14 }}>Oblee for web</b>
            <span className="badge">v{pkg.version}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
