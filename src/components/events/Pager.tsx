import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { buildDiscoverHref, pageNumbers } from "@/lib/utils/events";
import { PAGE_SIZE } from "@/lib/constants";

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
  if (total <= PAGE_SIZE) return null;
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const linkFor = (target: number) =>
    buildDiscoverHref({ path, q: query, cat: category, date, page: target });

  return (
    <nav className="pgr" aria-label="Pagination">
      <p>
        Showing {first}–{last} of {total} events
      </p>
      <div className="pgb">
        <Link href={linkFor(page - 1)} aria-label="Previous page" aria-disabled={page === 1} tabIndex={page === 1 ? -1 : undefined}>
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
            >
              {value}
            </Link>
          ),
        )}
        <Link href={linkFor(page + 1)} aria-label="Next page" aria-disabled={page === pageCount} tabIndex={page === pageCount ? -1 : undefined}>
          <Icon name="chevr" size={16} />
        </Link>
      </div>
    </nav>
  );
}
