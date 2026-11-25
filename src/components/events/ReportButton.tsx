"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { useUI } from "@/components/ui/UIProvider";
import { reportEventAction } from "@/lib/actions/events";
import { REPORT_REASONS } from "@/lib/constants";

export function ReportButton({ eventId, reported }: { eventId: string; reported: boolean }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(reported);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();
  const { toast } = useUI();

  if (done) {
    return (
      <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>
        <Icon name="flag" size={13} /> Reported. Our team is reviewing this event.
      </p>
    );
  }

  const submit = () => {
    startTransition(async () => {
      const result = await reportEventAction(eventId, reason, details);
      if (!result.ok) {
        toast(result.error);
        return;
      }
      setDone(true);
      setOpen(false);
      toast("Report sent. Thank you for keeping Oblee safe.");
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ marginTop: 18, fontSize: 12, color: "var(--mute)", display: "flex", alignItems: "center", gap: 6 }}
      >
        <Icon name="flag" size={13} /> Report this event
      </button>
      <Modal open={open} onClose={() => setOpen(false)} label="Report this event">
        <h3>Report this event</h3>
        <p className="sub">Tell us what is wrong. Reports go to the Oblee team, never to the organiser.</p>
        <label className="fl">
          Reason
          <select className="in" value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending}>
            {REPORT_REASONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="fl">
          Details (optional)
          <textarea
            className="in"
            style={{ height: 96 }}
            maxLength={600}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="What should we know?"
            disabled={pending}
          />
        </label>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button type="button" className="btn o" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={submit} disabled={pending}>
            {pending ? <span className="spin2" /> : null}
            {pending ? "Sending…" : "Send report"}
          </button>
        </div>
      </Modal>
    </>
  );
}
