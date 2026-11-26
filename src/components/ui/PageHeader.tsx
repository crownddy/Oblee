"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { canGoBack } from "@/lib/navigation/history";

export function PageHeader({
  title,
  backHref,
  variant = "back",
}: {
  title: string;
  backHref: string;
  variant?: "back" | "close";
}) {
  const router = useRouter();
  const label = variant === "close" ? "Close" : "Back";

  return (
    <div className="ch">
      <Link
        href={backHref}
        aria-label={label}
        onClick={(event) => {
          if (event.defaultPrevented || event.button !== 0) return;
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          if (!canGoBack()) return;
          event.preventDefault();
          router.back();
        }}
      >
        <Icon name={variant === "close" ? "close" : "back"} size={22} />
      </Link>
      <span>{title}</span>
      <span style={{ width: 40 }} />
    </div>
  );
}
