"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { useUI } from "@/components/ui/UIProvider";
import { archiveEventAction } from "@/lib/actions/events";

export function ArchiveButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useUI();

  const archive = () => {
    startTransition(async () => {
      const result = await archiveEventAction(eventId);
      if (!result.ok) {
        toast(result.error);
        return;
      }
      setOpen(false);
      toast("Event archived. Find it under Profile, Archived.");
      router.push("/profile?tab=archived");
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className="btn o" style={{ flex: "none", height: 48, padding: "0 20px" }} onClick={() => setOpen(true)}>
        Archive
      </button>
      <Modal open={open} onClose={() => setOpen(false)} label="Archive this event">
        <h3 id="at">Archive this event?</h3>
        <p style={{ color: "var(--mute)", margin: "8px 0 12px", fontSize: 13.5 }}>
          Archiving removes it from search, the home list, the carousel and saved lists. It stays in your Archived list, and only
          you can see it.
        </p>
        <p className="note" style={{ margin: "0 0 14px" }}>
          Events can’t be deleted once posted. Oblee keeps a record so an unsafe or illegal event can still be traced if people
          visited the place.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn o" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={archive} disabled={pending}>
            {pending ? <span className="spin2" /> : <Icon name="archive" size={18} />}
            {pending ? "Archiving…" : "Archive event"}
          </button>
        </div>
      </Modal>
    </>
  );
}
