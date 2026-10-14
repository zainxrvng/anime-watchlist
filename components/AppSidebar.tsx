"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useWatchlist } from "@/lib/useWatchlist";
import {
  WATCHLIST_LABELS,
  WATCHLIST_STATUSES,
  type WatchlistStatus,
} from "@/types/watchlist";

/** One colour per list, matching the pills on cards and the tab badges. */
const STATUS_DOT: Record<WatchlistStatus, string> = {
  watching: "bg-sky-400",
  planToWatch: "bg-amber-400",
  completed: "bg-emerald-400",
};

const ROW_BASE =
  "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

interface AppSidebarProps {
  /** Drawer state. Below lg this is what shows or hides the panel. */
  open: boolean;
  /** Closes the drawer — called on every link so navigating dismisses it. */
  onClose: () => void;
}

/**
 * Persistent navigation: home plus the three watchlist categories with live
 * counts. Category rows deep-link to `/watchlist?list=…` so the page opens on
 * the list you actually clicked.
 */
export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { lists } = useWatchlist();

  // `useSearchParams` would force a Suspense boundary through the root layout,
  // so the query is read off location instead. Re-synced on navigation and
  // popstate; link clicks below set it straight away so it never lags a click.
  const [queryList, setQueryList] = useState("");
  useEffect(() => {
    const sync = () => setQueryList(new URLSearchParams(window.location.search).get("list") ?? "");
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [pathname]);

  const onWatchlist = pathname === "/watchlist";
  const total = WATCHLIST_STATUSES.reduce((sum, status) => sum + lists[status].length, 0);

  return (
    <aside
      id="app-sidebar"
      aria-label="Primary"
      // `invisible` when shut keeps the off-canvas links out of the tab order;
      // lg: overrides restore it on desktop, where the panel is always in flow.
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-950 transition-transform duration-200 ease-out lg:translate-x-0 lg:visible motion-reduce:transition-none ${
        open ? "visible translate-x-0" : "invisible -translate-x-full"
      }`}
    >
      <div className="flex flex-col gap-6 p-4">
        <Link
          href="/"
          onClick={onClose}
          className="text-base font-semibold tracking-tight text-zinc-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <span aria-hidden="true" className="mr-2">
            🎬
          </span>
          Anime Watchlist
        </Link>

        <nav aria-label="Sections" className="flex flex-col gap-1">
          <Link
            href="/"
            onClick={onClose}
            aria-current={pathname === "/" ? "page" : undefined}
            className={`${ROW_BASE} ${
              pathname === "/"
                ? "bg-accent/15 font-medium text-zinc-50"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            }`}
          >
            Home
          </Link>

          <Link
            href="/watchlist"
            onClick={onClose}
            aria-current={onWatchlist ? "page" : undefined}
            className={`${ROW_BASE} ${
              onWatchlist
                ? "bg-accent/15 font-medium text-zinc-50"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            }`}
          >
            <span>My Watchlist</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
              {total}
            </span>
          </Link>
        </nav>

        <div className="flex flex-col gap-1">
          <h2 className="px-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Categories
          </h2>

          <ul className="flex flex-col gap-1">
            {WATCHLIST_STATUSES.map((status) => {
              const isCurrent = onWatchlist && queryList === status;

              return (
                <li key={status}>
                  <Link
                    href={`/watchlist?list=${status}`}
                    onClick={() => {
                      setQueryList(status);
                      onClose();
                    }}
                    // "location" rather than "page": this is a view inside the
                    // watchlist, which the row above already marks as the page.
                    aria-current={isCurrent ? "location" : undefined}
                    className={`${ROW_BASE} ${
                      isCurrent
                        ? "bg-accent/15 font-medium text-zinc-50"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]}`}
                      />
                      <span className="truncate">{WATCHLIST_LABELS[status]}</span>
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
                      {lists[status].length}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
