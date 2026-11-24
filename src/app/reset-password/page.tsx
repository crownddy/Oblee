import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfigNotice } from "@/components/ui/ConfigNotice";
import { ResetPasswordForm } from "@/components/auth/AuthForms";
import { getViewer } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const viewer = isSupabaseConfigured ? await getViewer() : null;

  return (
    <div className="page">
      <PageHeader title="New password" backHref="/login" />
      <div className="body au">
        {!isSupabaseConfigured ? (
          <>
            <ConfigNotice
              compact
              title="Preview mode"
              intro="Supabase is not connected yet, so password recovery cannot send email. Add the environment variables below to turn it on."
            />
            <h2 style={{ fontSize: 21, fontWeight: 800, marginTop: 14 }}>Choose a new password</h2>
            <p className="sub">Use at least 8 characters. You will sign in again afterwards.</p>
            <ResetPasswordForm />
          </>
        ) : viewer ? (
          <>
            <h2 style={{ fontSize: 21, fontWeight: 800 }}>Choose a new password</h2>
            <p className="sub">Use at least 8 characters. You will sign in again afterwards.</p>
            <ResetPasswordForm />
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 21, fontWeight: 800 }}>This link has expired</h2>
            <p className="sub">Password reset links can only be used once. Request a fresh one.</p>
            <Link className="btn full" href="/forgot-password" style={{ marginTop: 8 }}>
              Request a new link
            </Link>
          </>
        )}
        <p className="note">
          Need help?{" "}
          <Link className="link" href="/login">
            Return to log in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
