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
              <b>What we store.</b> Your name, email address, date of birth, account role and the events you save or publish.
              Passwords are held by Supabase Auth and are never stored in the Oblee database.
            </li>
            <li>
              <b>Age checks.</b> Oblee is for people aged 18 and over. We use your date of birth only to confirm your age,
              which we verify on the server when you register. We do not collect or keep identity documents, ID numbers or
              selfies. Your date of birth is not shown on your profile, is not returned by the public API and is not shared
              with organisers. Accounts created before the 18+ rule can confirm their date of birth once from their
              profile. If you ask us to close your account, the date of birth is deleted with the rest of your profile.
            </li>
            <li>
              <b>Private events.</b> If you are approved for a private event, we store the link between your account and that
              event so we can show it to you. Only the organiser and Oblee administrators can see who was approved, and we
              remove the link when access is withdrawn.
            </li>
            <li>
              <b>Event content.</b> Event titles, descriptions, images, dates, venues and contact details you publish are public.
              Uploaded cover images sit in a private storage bucket and are shown through short-lived signed links, so a
              private event&apos;s cover is only served to people who may already see that event.
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
