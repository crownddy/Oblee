"use client";

import { useEffect, useState } from "react";

const CONFETTI = ["#ff4fa3", "#ffb000", "#8b5cf6", "#22d3ee", "#ff6b4a"];

/**
 * The mark animation runs once (pin, trail, wordmark, tagline) and the curtain
 * then steps aside, so the server-rendered page is reachable in ~3s rather than
 * ~4.4s. Reduced-motion visitors skip the intro entirely.
 */
const HOLD_MS = 2400;
const EXIT_MS = 700;

export function Splash() {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    // A repeat visit is hidden by CSS (html[data-splash="seen"] .spl); skip the timers.
    if (document.documentElement.getAttribute("data-splash") === "seen") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const remember = () => {
      try {
        sessionStorage.setItem("oblee-splash", "1");
      } catch {
        /* ignore */
      }
    };
    // Nothing to animate for someone who asked for less motion, so the page
    // underneath is available immediately.
    if (reduced) {
      remember();
      const skip = window.setTimeout(() => setGone(true), 0);
      return () => window.clearTimeout(skip);
    }
    const finish = () => {
      setLeaving(true);
      remember();
      return window.setTimeout(() => setGone(true), EXIT_MS);
    };
    const timer = window.setTimeout(finish, HOLD_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") finish();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (gone) return null;

  const dismiss = () => {
    setLeaving(true);
    try {
      sessionStorage.setItem("oblee-splash", "1");
    } catch {
      /* ignore */
    }
    window.setTimeout(() => setGone(true), EXIT_MS);
  };

  return (
    <div
      className={`spl${leaving ? " out" : ""}`}
      id="spl"
      role="img"
      aria-label="Oblee. Find the party you love."
      onClick={dismiss}
    >
      <i className="so a" />
      <i className="so b" />
      <div className="stg">
        <svg className="rt" viewBox="0 0 300 340" aria-hidden="true">
          <defs>
            <linearGradient id="spg" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#ffb000" />
              <stop offset=".5" stopColor="#ff4fa3" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
            <mask id="spm">
              <path
                className="draw"
                d="M10 330 C70 335 90 285 125 272 S 185 285 190 244"
                pathLength={1}
                fill="none"
                stroke="#fff"
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray="1"
                strokeDashoffset="1"
              />
            </mask>
          </defs>
          <path
            d="M10 330 C70 335 90 285 125 272 S 185 285 190 244"
            fill="none"
            stroke="url(#spg)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="1 11"
            mask="url(#spm)"
          />
          {CONFETTI.map((color, index) => {
            const angle = (index / CONFETTI.length) * Math.PI * 2;
            const radius = 60 + ((index * 37) % 50);
            const cx = Math.round((190 + Math.cos(angle) * radius) * 100) / 100;
            const cy = Math.round((186 + Math.sin(angle) * radius) * 100) / 100;
            return (
              <circle
                key={color + index}
                className="cf"
                cx={cx}
                cy={cy}
                r={5 + (index % 4)}
                fill={color}
                style={{ animationDelay: `${1.4 + (index % 5) * 0.02}s` }}
              />
            );
          })}
        </svg>
        <i className="rp" />
        <i className="rp" style={{ animationDelay: "1.75s" }} />
        <img className="pin" src="/brand/logo-pin.png" alt="" width={198} height={240} loading="lazy" decoding="async" />
      </div>
      <img className="wm2 lt" src="/brand/wordmark-on-light.png" alt="Oblee" width={319} height={100} loading="lazy" decoding="async" />
      <img className="wm2 dk" src="/brand/wordmark-on-dark.png" alt="" width={319} height={100} loading="lazy" decoding="async" />
      <img className="stl lt" src="/brand/tagline-on-light.png" alt="Find the party you love" width={302} height={44} loading="lazy" decoding="async" />
      <img className="stl dk" src="/brand/tagline-on-dark.png" alt="" width={302} height={44} loading="lazy" decoding="async" />
    </div>
  );
}
