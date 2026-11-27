"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useUI } from "@/components/ui/UIProvider";
import { archiveEventAction } from "@/lib/actions/events";

export function ArchiveButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const router = useRouter();
  const { toast } = useUI();

  const openSheet = () => {
    setError(null);
    setOpen(true);
  };

  const closeSheet = () => {
    if (pending || inFlight.current) return;
    setOpen(false);
    setError(null);
  };

  const archive = () => {
    if (pending || inFlight.current) return;
    inFlight.current = true;
    setError(null);

    startTransition(async () => {
      const result = await archiveEventAction(eventId);
      inFlight.current = false;

      if (!result.ok) {
        setError(result.error);
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
      <button
        type="button"
        className="btn o"
        style={{ flex: "none", height: 48, padding: "0 20px" }}
        onClick={openSheet}
      >
        Archive
      </button>

      <Modal
        open={open}
        onClose={closeSheet}
        label="Archive this event"
        labelledBy="archive-sheet-title"
        dismissible={!pending}
      >
        <div className="sheethead">
          <span className="sheeticon" aria-hidden="true">
            <Icon name="archive" size={20} />
          </span>
          <div className="sheetheadtext">
            <h3 id="archive-sheet-title">Archive this event?</h3>
            <p className="sheetsub">It disappears from Oblee for everyone else.</p>
          </div>
        </div>

        <p className="sheetcopy">
          Archiving removes it from search, the home list, the carousel and saved lists. It stays in your
          Archived list, and only you can see it.
        </p>
        <p className="note sheetnote">
          Events can’t be deleted once posted. Oblee keeps a record so an unsafe or illegal event can still be
          traced if people visited the place.
        </p>

        {error ? (
          <Alert tone="error" title="Could not archive" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <div className="sheetact">
          <button type="button" className="btn o" onClick={closeSheet} disabled={pending} data-autofocus>
            Cancel
          </button>
          <button type="button" className="btn warn" onClick={archive} disabled={pending} aria-busy={pending}>
            {pending ? <span className="spin2" /> : <Icon name="archive" size={18} />}
            {pending ? "Archiving…" : "Archive event"}
          </button>
        </div>
      </Modal>
    </>
  );
}
