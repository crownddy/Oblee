import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Terms and Conditions" };

export default function TermsPage() {
  return (
    <div className="page">
      <PageHeader title="Terms & Conditions" backHref="/" variant="close" />
      <div className="body">
        <div className="pad" style={{ paddingBottom: 32 }}>
          <p className="muted" style={{ fontSize: 12 }}>
            Last updated {new Date().getFullYear()}
          </p>
          <p style={{ fontSize: 13.5, marginTop: 10 }}>
            Oblee is a discovery platform for events and parties. These terms cover everyone who uses Oblee: attendees, organisers
            and administrators.
          </p>
          <ol className="tm">
            <li>
              <b>Posting events.</b> You confirm that you have the right to post the event and that the details you publish are
              accurate: name, venue, date, contacts, prices and entry rules.
            </li>
            <li>
              <b>Lawful use.</b> You agree to comply with all applicable laws and regulations where your event takes place.
            </li>
            <li>
              <b>Content.</b> You will not post harmful, illegal, misleading or copyrighted content. Only upload images you have the
              right to use.
            </li>
            <li>
              <b>Moderation.</b> Oblee may remove, archive or edit any event at any time, including when a report is upheld.
            </li>
            <li>
              <b>Attendance and payments.</b> Oblee lists events and passes RSVP messages. Organisers manage their own bookings,
              tables and payments until in-app payments are available. Oblee does not process payments today.
            </li>
            <li>
              <b>Liability.</b> Oblee is not liable for any loss, damage or incident that occurs at an event. Verify the venue,
              security and identity requirements before you travel.
            </li>
            <li>
              <b>Accounts.</b> You are responsible for keeping your login details safe. Do not share your account.
            </li>
            <li>
              <b>Age requirement.</b> Oblee is only for people aged 18 and over. You must give your real date of birth when
              you register; we check it on our servers and refuse accounts for anyone under 18. If we discover an account
              belongs to someone under 18, we will close it. Accounts created before this rule must confirm a date of
              birth once, before they can publish again. Do not send us identity documents: we do not ask for them and we
              do not store them.
            </li>
            <li>
              <b>Private events.</b> Private events are visible only to the organiser, Oblee administrators and attendees the
              organiser has approved. Do not share private event details or access links with people who were not invited.
              Covers for private events are served through short-lived links that stop working for anyone who is not
              approved.
            </li>
          </ol>
          <p className="note">
            Questions about these terms? Read the{" "}
            <Link className="link" href="/privacy">
              Privacy Policy
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
