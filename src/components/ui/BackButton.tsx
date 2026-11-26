"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { goBackToOrigin } from "@/lib/navigation/history";

export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();

  return (
    <button className="cir" type="button" aria-label="Back" onClick={() => goBackToOrigin(router, fallback)}>
      <Icon name="back" size={20} />
    </button>
  );
}
