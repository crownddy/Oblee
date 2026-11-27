"use client";

import { useActionState } from "react";
import { submitDateOfBirthAction, type AgeActionState } from "@/lib/actions/age";
import { Alert } from "@/components/ui/Alert";
import { useStatusAlert } from "@/components/ui/useStatusAlert";
import { latestAdultBirthDate } from "@/lib/utils/age";

const IDLE: AgeActionState = { status: "idle" };

export function AgeVerificationForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(submitDateOfBirthAction, IDLE);
  const { alert, dismiss } = useStatusAlert(state);

  return (
    <form action={action} noValidate>
      <input type="hidden" name="next" value={next} />
      <label className="fl">
        Date of birth
        <input
          className="in"
          name="dateOfBirth"
          type="date"
          autoComplete="bday"
          max={latestAdultBirthDate()}
          required
        />
      </label>
      <p className="note" style={{ marginTop: -4 }}>
        Oblee is for people aged 18 and over. We check this on our servers and keep only the date. No ID, passport or
        selfie is ever requested.
      </p>
      {alert ? (
        <Alert tone={alert.tone} onDismiss={dismiss}>
          {alert.message}
        </Alert>
      ) : null}
      <button className="btn full" type="submit" disabled={pending}>
        {pending ? <span className="spin2" /> : null}
        {pending ? "Checking…" : "Confirm my age"}
      </button>
    </form>
  );
}
