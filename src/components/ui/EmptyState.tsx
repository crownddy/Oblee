import Link from "next/link";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="emp">
      <b>{title}</b>
      <br />
      {body}
      {action ? (
        <div style={{ marginTop: 14 }}>
          <Link className="btn" style={{ display: "inline-flex", width: "auto", padding: "0 24px", flex: "none" }} href={action.href}>
            {action.label}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
