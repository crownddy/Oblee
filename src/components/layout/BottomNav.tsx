"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";

const ITEMS: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/explore", label: "Explore", icon: "compass" },
  { href: "/saved", label: "Saved", icon: "heart" },
  { href: "/settings", label: "Profile", icon: "user" },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="bar nav" id="nv" aria-label="Main">
      {ITEMS.slice(0, 2).map((item) => (
        <Link key={item.href} href={item.href} className={isActive(item.href) ? "on" : ""} aria-current={isActive(item.href) ? "page" : undefined}>
          <Icon name={item.icon} size={22} />
          {item.label}
        </Link>
      ))}
      <Link href="/events/new" className="plus" aria-label="Post an event">
        <Icon name="plus" size={26} />
      </Link>
      {ITEMS.slice(2).map((item) => (
        <Link key={item.href} href={item.href} className={isActive(item.href) ? "on" : ""} aria-current={isActive(item.href) ? "page" : undefined}>
          <Icon name={item.icon} size={22} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
