import Link from "next/link";
import { ReportActions } from "@/components/admin/AdminControls";
import { adminListReports } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const reports = await adminListReports();
  const open = reports.filter((report) => report.status === "open" || report.status === "reviewing");

  return (
    <>
      <div className="sec" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 16 }}>Event reports</h3>
        <span className="muted" style={{ fontSize: 12 }}>{open.length} need attention</span>
      </div>

      {reports.length === 0 ? (
        <p className="muted">No reports have been sent.</p>
      ) : (
        reports.map((report) => (
          <div className="card" key={report.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
              <Link href={`/events/${report.eventId}`} className="link" style={{ fontWeight: 800 }}>
                {report.eventTitle}
              </Link>
              <span
                className={`badge${report.status === "open" ? " warn" : report.status === "resolved" ? " ok" : report.status === "dismissed" ? " danger" : ""}`}
              >
                {report.status}
              </span>
            </div>
            <p style={{ fontSize: 12.5, marginTop: 6 }}>
              <b>{report.reason}</b>
            </p>
            {report.details ? (
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                “{report.details}”
              </p>
            ) : null}
            <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              Reported by {report.reporterName} · {new Date(report.createdAt).toLocaleString("en-GB")}
            </p>
            <div style={{ marginTop: 10 }}>
              <ReportActions reportId={report.id} status={report.status} />
            </div>
          </div>
        ))
      )}
    </>
  );
}
