"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { readScroll, recordLocation, resetHistory, saveScroll } from "@/lib/navigation/history";

// Pages stream their content in, so a restore keeps trying briefly instead of
// giving up the first time the container is shorter than the saved offset.
const RESTORE_WINDOW_MS = 900;
const POP_GRACE_MS = 1000;
const USER_SCROLL_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

function scrollContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".body");
}

function restoreScroll(path: string) {
  const target = readScroll(path);
  if (!target) return;

  let cancelled = false;
  const cancel = () => {
    cancelled = true;
  };
  USER_SCROLL_EVENTS.forEach((type) => window.addEventListener(type, cancel, { once: true, passive: true }));

  // Re-applied every frame for the length of the window: at popstate the
  // outgoing screen is still mounted, so the first write can land on the wrong
  // container, and content that arrives late moves the reachable offset.
  const startedAt = performance.now();
  const tick = () => {
    const container = scrollContainer();
    if (container) container.scrollTop = target;
    if (cancelled || performance.now() - startedAt > RESTORE_WINDOW_MS) return;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Tracks the in-app trail and each screen's scroll offset for the back controls. */
export function NavigationMemory() {
  const pathname = usePathname();
  const handledPop = useRef<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Recorded from the popstate handler rather than the render effect: the URL
    // is already the destination by then, so the trail stays right whichever
    // listener the router happens to run first.
    const onPopState = () => {
      const path = window.location.pathname;
      handledPop.current = path;
      window.setTimeout(() => {
        if (handledPop.current === path) handledPop.current = null;
      }, POP_GRACE_MS);

      if (recordLocation(path, { popped: true }) === "pop") restoreScroll(path);
    };
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.classList.contains("body")) {
        saveScroll(window.location.pathname, target.scrollTop);
      }
    };

    window.addEventListener("popstate", onPopState);
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!pathname) return;

    if (!started.current) {
      started.current = true;
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      // A bfcache restore keeps the trail from before the user left the app.
      if (navigation?.type !== "back_forward") resetHistory(pathname);
      return;
    }

    if (handledPop.current === pathname) {
      handledPop.current = null;
      return;
    }

    recordLocation(pathname);
  }, [pathname]);

  return null;
}
