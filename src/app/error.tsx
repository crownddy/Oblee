"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page">
      <div className="body">
        <div className="pad" style={{ paddingTop: 64 }}>
          <div className="emp">
            <b>Something went wrong</b>
            <br />
            Oblee could not load that screen. Try again, or head back to discovery.
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button type="button" className="btn" onClick={reset}>
                Try again
              </button>
              <Link className="btn o" href="/">
                Back to discovery
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
