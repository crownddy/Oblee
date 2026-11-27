"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PAGE_SIZE } from "@/lib/constants";
import { buildDiscoverHref, pageNumbers } from "@/lib/utils/events";
import { pluralize } from "@/lib/utils/format";

/**
 * `.body` is the scrolling element inside the app frame, so the browser's own
 * scroll restoration never fires. Reset it on page change, unless the reader is
 * already near the top (no point animating a scroll nobody can see).
 */
function scrollToResults() {
  const body = document.querySelector<HTMLElement>(".body");
  if (!body || body.scrollTop < 80) return;
  const reduced =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  body.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
}

export function Pager({
  total,
  page,
  pageCount,
  query,
  category,
  date,
  path,
}: {
  total: number;
  page: number;
  pageCount: number;
  query?: string;
  category?: string;
  date?: string;
  path: string;
}) {
  if (total <= 0) return null;

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const linkFor = (target: number) =>
    buildDiscoverHref({ path, q: query, cat: category, date, page: target });

  return (
    <nav className="pgr" aria-label="Pagination">
      <p role="status">
        {pageCount === 1 ? pluralize(total, "event") : `Showing ${first}–${last} of ${total} events`}
      </p>
      {pageCount > 1 ? (
        <div className="pgb">
          <Link
            href={linkFor(page - 1)}
            aria-label="Previous page"
            aria-disabled={page === 1}
            tabIndex={page === 1 ? -1 : undefined}
            onClick={scrollToResults}
          >
            <Icon name="back" size={16} />
          </Link>
          {pageNumbers(page, pageCount).map((value, index) =>
            value === "…" ? (
              <span className="dts" key={`gap-${index}`}>
                …
              </span>
            ) : (
              <Link
                key={value}
                href={linkFor(value)}
                className={value === page ? "on" : undefined}
                aria-current={value === page ? "page" : undefined}
                onClick={scrollToResults}
              >
                {value}
              </Link>
            ),
          )}
          <Link
            href={linkFor(page + 1)}
            aria-label="Next page"
            aria-disabled={page === pageCount}
            tabIndex={page === pageCount ? -1 : undefined}
            onClick={scrollToResults}
          >
            <Icon name="chevr" size={16} />
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
