"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/featured", label: "Featured" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="seg" style={{ overflowX: "auto", flexWrap: "nowrap" }}>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(pathname === tab.href && "on")}
          aria-current={pathname === tab.href ? "page" : undefined}
          style={{ whiteSpace: "nowrap" }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
