"use client";

import { useUI } from "@/components/ui/UIProvider";

export function BookTableButton() {
  const { toast } = useUI();

  return (
    <button
      type="button"
      className="btn"
      style={{ width: "100%", marginTop: 12, flex: "none", height: 46 }}
      onClick={() => toast("Table booking opens when payments launch. Contact the organiser below to reserve.")}
    >
      Book Table
    </button>
  );
}
