import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfigNotice } from "@/components/ui/ConfigNotice";
import { RegisterForm } from "@/components/auth/AuthForms";
import { getViewer } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/utils/request";
import { firstParam, type SearchParamsRecord } from "@/lib/utils/searchParams";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const params = await searchParams;
  const next = safeNextPath(firstParam(params.next));
  const viewer = await getViewer();
  if (viewer) redirect(next);

  const loginHref = next === "/profile" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <div className="page">
      <PageHeader title="Create account" backHref="/" />
      <div className="body au">
        <div className="seg">
          <Link href={loginHref}>Log in</Link>
          <Link href="/register" className="on" aria-current="page">
            Register
          </Link>
        </div>
        <div style={{ marginTop: 18 }}>{isSupabaseConfigured ? null : (
          <ConfigNotice
            compact
            title="Preview mode"
            intro="Supabase is not connected yet, so this form cannot sign you in. Add the environment variables below to turn on real authentication."
          />
        )}
        <RegisterForm next={next} /></div>
      </div>
    </div>
  );
}
