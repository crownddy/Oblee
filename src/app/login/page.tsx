import Link from "next/link";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfigNotice } from "@/components/ui/ConfigNotice";
import { PageNotice } from "@/components/ui/PageNotice";
import { LoginForm } from "@/components/auth/AuthForms";
import { getViewer } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/utils/request";
import { firstParam, type SearchParamsRecord } from "@/lib/utils/searchParams";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Log in",
  robots: PRIVATE_ROBOTS,
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const params = await searchParams;
  const next = safeNextPath(firstParam(params.next));
  const viewer = await getViewer();
  if (viewer) redirect(next);

  const registerHref = next === "/profile" ? "/register" : `/register?next=${encodeURIComponent(next)}`;

  return (
    <div className="page">
      <PageHeader title="Log in" backHref="/" />
      <div className="body au">
        <div className="seg">
          <Link href="/login" className="on" aria-current="page">
            Log in
          </Link>
          <Link href={registerHref}>Register</Link>
        </div>
        {firstParam(params.reset) === "1" ? (
          <PageNotice tone="success">Password updated. Log in with your new password.</PageNotice>
        ) : null}
        {firstParam(params.error) === "link" ? (
          <PageNotice tone="warning">That link is no longer valid. Request a new one and try again.</PageNotice>
        ) : null}
        <div style={{ marginTop: 18 }}>
          {isSupabaseConfigured ? null : (
          <ConfigNotice
            compact
            title="Preview mode"
            intro="Supabase is not connected yet, so this form cannot sign you in. Add the environment variables below to turn on real authentication."
          />
        )}
        <LoginForm next={next} />
        </div>
        <p className="note">
          Sessions are handled by Supabase Auth. Oblee never stores your password in the app database.
        </p>
      </div>
    </div>
  );
}
