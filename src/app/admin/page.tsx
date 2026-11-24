import Link from "next/link";
import { getAdminSummary } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin/users", title: "Manage users", body: "Change attendee, organiser and administrator roles." },
  { href: "/admin/events", title: "Manage events", body: "Review every listing and remove unsafe events." },
  { href: "/admin/reports", title: "Review event reports", body: "Work through reports sent by attendees." },
  { href: "/admin/featured", title: "Manage featured events", body: "Choose what sits on the home carousel." },
];

export default async function AdminOverviewPage() {
  const summary = await getAdminSummary();

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>{summary.users}</b>
          <small>Registered people</small>
        </div>
        <div className="stat">
          <b>{summary.publishedEvents}</b>
          <small>Published events</small>
        </div>
        <div className="stat">
          <b>{summary.openReports}</b>
          <small>Reports waiting</small>
        </div>
        <div className="stat">
          <b>{summary.featuredEvents}</b>
          <small>Featured events</small>
        </div>
      </div>

      <div className="sec">
        <h3 style={{ fontSize: 16 }}>Work queues</h3>
      </div>

      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="card" style={{ display: "block" }}>
          <b>{link.title}</b>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {link.body}
          </p>
        </Link>
      ))}
    </>
  );
}
