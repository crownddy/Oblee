import Link from "next/link";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfigNotice } from "@/components/ui/ConfigNotice";
import { AgeVerificationForm } from "@/components/profile/AgeVerificationForm";
import { requireUser } from "@/lib/auth/session";
import { getMyAgeStatus } from "@/lib/services/age";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/utils/request";
import { firstParam, type SearchParamsRecord } from "@/lib/utils/searchParams";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Verify your age",
  robots: PRIVATE_ROBOTS,
};

export default async function VerifyAgePage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const params = await searchParams;
  const next = safeNextPath(firstParam(params.next), "/profile");

  if (!isSupabaseConfigured) {
    return (
      <div className="page">
        <PageHeader title="Verify your age" backHref="/profile" />
        <div className="body au">
          <ConfigNotice
            compact
            title="Preview mode"
            intro="Supabase is not connected yet, so this form cannot store a date of birth. Add the environment variables below to turn it on."
          />
          <AgeVerificationForm next={next} />
        </div>
      </div>
    );
  }

  await requireUser(`/verify-age?next=${encodeURIComponent(next)}`);
  const status = await getMyAgeStatus();

  if (status?.isAdult) {
    return (
      <div className="page">
        <PageHeader title="Verify your age" backHref="/profile" />
        <div className="body au">
          <h2 style={{ fontSize: 21, fontWeight: 800 }}>You are already verified</h2>
          <p className="sub">
            Your date of birth is on file and you are over 18. Nothing else is needed to publish events.
          </p>
          <Link className="btn full" href={next === "/profile" ? "/" : next} style={{ marginTop: 8 }}>
            Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title="Verify your age" backHref="/profile" />
      <div className="body au">
        <h2 style={{ fontSize: 21, fontWeight: 800 }}>One quick check</h2>
        <p className="sub">
          {status && !status.hasDateOfBirth
            ? "Your account was created before Oblee asked for a date of birth. Add it once to keep publishing events."
            : "We need your date of birth before you can publish events on Oblee."}
        </p>
        <AgeVerificationForm next={next} />
        <p className="note">
          Rather not?{" "}
          <Link className="link" href="/">
            Keep browsing events
          </Link>
          . You can verify whenever you want to publish.
        </p>
      </div>
    </div>
  );
}
