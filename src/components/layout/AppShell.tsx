"use client";

import { usePathname } from "next/navigation";
import { AppearanceSheet } from "@/components/layout/AppearanceSheet";
import { BottomNav } from "@/components/layout/BottomNav";
import { Splash } from "@/components/layout/Splash";
import { UIProvider } from "@/components/ui/UIProvider";

const NAV_ROUTES = new Set(["/", "/explore", "/saved", "/profile"]);

const FLAKES = Array.from({ length: 40 }, (_, index) => {
  const seed = (value: number) => {
    const x = Math.sin(index * 12.9898 + value * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const size = 2 + seed(1) * 4;
  return {
    left: `${(seed(2) * 100).toFixed(1)}%`,
    width: `${size.toFixed(1)}px`,
    height: `${size.toFixed(1)}px`,
    opacity: (0.45 + seed(3) * 0.55).toFixed(2),
    animationDuration: `${(6 + seed(4) * 9).toFixed(1)}s, ${(2 + seed(5) * 3).toFixed(1)}s`,
    animationDelay: `${(-seed(6) * 12).toFixed(1)}s, ${(-seed(7) * 4).toFixed(1)}s`,
  };
});

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = NAV_ROUTES.has(pathname);

  return (
    <main className="app" id="app">
      <Splash />
      <UIProvider renderAppearance={(open, close) => <AppearanceSheet open={open} onClose={close} />}>
        {children}
        {showNav ? <BottomNav /> : null}
      </UIProvider>
      <div className="snow" aria-hidden="true">
        {FLAKES.map((flake, index) => (
          <i key={index} style={flake} />
        ))}
      </div>
    </main>
  );
}
