import Link from "next/link";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfigNotice } from "@/components/ui/ConfigNotice";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Reset your password",
  robots: PRIVATE_ROBOTS,
};

export default function ForgotPasswordPage() {
  return (
    <div className="page">
      <PageHeader title="Reset password" backHref="/login" />
      <div className="body au">
        <h2 style={{ fontSize: 21, fontWeight: 800 }}>Forgot your password?</h2>
        <p className="sub">Enter the email you signed up with and we will send a reset link.</p>
        {isSupabaseConfigured ? null : (
        <ConfigNotice
          compact
          title="Preview mode"
          intro="Supabase is not connected yet, so password recovery cannot send email. Add the environment variables below to turn it on."
        />
      )}
      <ForgotPasswordForm />
        <p className="note">
          Remembered it?{" "}
          <Link className="link" href="/login">
            Back to log in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
