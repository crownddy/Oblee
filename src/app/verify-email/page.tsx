import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfigNotice } from "@/components/ui/ConfigNotice";
import { Icon } from "@/components/ui/Icon";
import { ResendVerificationForm } from "@/components/auth/AuthForms";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { firstParam, type SearchParamsRecord } from "@/lib/utils/searchParams";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const params = await searchParams;
  const email = firstParam(params.email);

  return (
    <div className="page">
      <PageHeader title="Verify your email" backHref="/login" />
      <div className="body au">
        <div className="orbL" style={{ width: 96, height: 96, display: "grid", placeItems: "center", color: "#fff" }} aria-hidden="true">
          <Icon name="mail" size={34} />
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 800, marginTop: 18 }}>Check your inbox</h2>
        <p className="sub">
          {email ? (
            <>
              We sent a verification link to <b>{email}</b>. Open it to activate your Oblee account.
            </>
          ) : (
            "We sent you a verification link. Open it to activate your Oblee account."
          )}
        </p>
        {isSupabaseConfigured ? (
          <ResendVerificationForm email={email} />
        ) : (
          <ConfigNotice title="Email verification needs Supabase" intro="Supabase Auth sends the verification email and confirms the link." compact />
        )}
        <p className="note">
          Already verified?{" "}
          <Link className="link" href="/login">
            Log in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
