"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();

  return (
    <button
      className="cir"
      type="button"
      aria-label="Back"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
    >
      <Icon name="back" size={20} />
    </button>
  );
}
