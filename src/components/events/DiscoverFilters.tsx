"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { QUICK_FILTERS, TYPE_TABS, categoryColor, categoryLabel } from "@/lib/constants";
import { buildDiscoverHref } from "@/lib/utils/events";

export function DiscoverFilters({
  path,
  initialQuery,
  category,
  date,
  shownTypes = TYPE_TABS,
  focusSearch = false,
}: {
  path: string;
  initialQuery: string;
  category: string;
  date: string;
  shownTypes?: readonly string[];
  focusSearch?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [syncedQuery, setSyncedQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  if (initialQuery !== syncedQuery) {
    setSyncedQuery(initialQuery);
    setQuery(initialQuery);
  }

  useEffect(() => {
    const currentQuery = searchParams.get("q") ?? "";
    if (query === currentQuery) return;
    const timer = setTimeout(() => {
      startTransition(() => {
        router.replace(
          buildDiscoverHref({
            path,
            q: query,
            cat: searchParams.get("cat") ?? "",
            date: searchParams.get("date") ?? "",
          }),
          { scroll: false },
        );
      });
    }, 320);
    return () => clearTimeout(timer);
  }, [query, path, router, searchParams]);

  const replace = (next: { cat?: string; date?: string }) => {
    startTransition(() => {
      router.replace(
        buildDiscoverHref({
          path,
          q: searchParams.get("q") ?? "",
          cat: next.cat !== undefined ? next.cat : (searchParams.get("cat") ?? ""),
          date: next.date !== undefined ? next.date : (searchParams.get("date") ?? ""),
        }),
        { scroll: false },
      );
    });
  };

  const dateLabel = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : "Search by date";

  return (
    <div aria-busy={isPending} style={isPending ? { opacity: 0.72, transition: "opacity .2s" } : undefined}>
      <div className="tys" id="tys">
        {shownTypes.map((type) => (
          <button
            key={type}
            type="button"
            style={{ "--c": categoryColor(type) } as React.CSSProperties}
            aria-pressed={category === type}
            onClick={() => replace({ cat: category === type ? "" : type })}
          >
            <i />
            {categoryLabel(type)}
          </button>
        ))}
      </div>

      <div id="sw">
        <div className="sb">
          <span id="si">
            <Icon name="search" size={18} />
          </span>
          <input
            id="q"
            type="search"
            placeholder="Search events or places"
            aria-label="Search events"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus={focusSearch}
            enterKeyHint="search"
          />
          <div className="dwrap">
            <label className={`dbtn${date ? " on" : ""}`} id="ft">
              <span id="fl">
                <Icon name="cal" size={16} />
                {dateLabel}
              </span>
              <input
                id="dd"
                type="date"
                aria-label="Search by date"
                value={date}
                min={new Date().toLocaleDateString("en-CA")}
                onChange={(event) => replace({ date: event.target.value })}
              />
            </label>
            {date ? (
              <button type="button" id="dc" aria-label="Clear date" onClick={() => replace({ date: "" })}>
                ×
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="cats" id="cats">
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            aria-pressed={(filter.value === "" ? category === "" : category === filter.value)}
            style={{ "--c": filter.color } as React.CSSProperties}
            onClick={() => replace({ cat: filter.value === "" ? "" : filter.value === category ? "" : filter.value })}
          >
            <i>
              <Icon name={filter.icon} size={22} />
            </i>
            {filter.label}
          </button>
        ))}
      </div>
      <span className="sr-only" role="status">
        {isPending ? "Updating events" : ""}
      </span>
    </div>
  );
}
