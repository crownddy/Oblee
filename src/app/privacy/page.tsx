import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="page">
      <PageHeader title="Privacy Policy" backHref="/" variant="close" />
      <div className="body">
        <div className="pad" style={{ paddingBottom: 32 }}>
          <p className="muted" style={{ fontSize: 12 }}>
            Last updated {new Date().getFullYear()}
          </p>
          <p style={{ fontSize: 13.5, marginTop: 10 }}>
            Oblee collects only what it needs to run event discovery and account access.
          </p>
          <ol className="tm">
            <li>
              <b>What we store.</b> Your name, email address, account role and the events you save or publish. Passwords are held by
              Supabase Auth and are never stored in the Oblee database.
            </li>
            <li>
              <b>Event content.</b> Event titles, descriptions, images, dates, venues and contact details you publish are public.
            </li>
            <li>
              <b>Reports.</b> If you report an event, your name and message go to Oblee administrators so the report can be
              reviewed.
            </li>
            <li>
              <b>Third parties.</b> Supabase provides authentication, database and file storage. Google Maps renders venue maps when
              you open an event page. Oblee does not sell your data.
            </li>
            <li>
              <b>Your control.</b> You can remove saved events at any time. To close an account or correct your details, contact the
              Oblee team.
            </li>
          </ol>
          <p className="note">
            Read the{" "}
            <Link className="link" href="/terms">
              Terms &amp; Conditions
            </Link>{" "}
            or return to{" "}
            <Link className="link" href="/">
              discovery
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
