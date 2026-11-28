import { requireAdmin } from "@/lib/auth/session";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminTabs } from "@/components/admin/AdminTabs";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administration",
  robots: PRIVATE_ROBOTS,
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireAdmin();

  return (
    <div className="page">
      <PageHeader title="Oblee Admin" backHref="/profile" />
      <div className="body">
        <div className="pad">
          <AdminTabs />
          <p className="muted" style={{ fontSize: 11.5, margin: "8px 0 0" }}>
            Signed in as {viewer.email}. Role checks run in the database, not in this browser.
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}
