"use client";

import { useRef, type KeyboardEvent } from "react";

import type { Anime } from "@/types/anime";
import { WATCHLIST_LABELS, WATCHLIST_STATUSES, type WatchlistStatus } from "@/types/watchlist";

interface WatchlistTabsProps {
  lists: Record<WatchlistStatus, Anime[]>;
  active: WatchlistStatus;
  onSelect: (status: WatchlistStatus) => void;
}

/**
 * Three tabs, each carrying a badge with how many titles are in that list.
 *
 * Follows the ARIA tabs pattern: one stop in the tab order (the selected tab)
 * and arrow keys to move between them, rather than three separate tab stops.
 */
export function WatchlistTabs({ lists, active, onSelect }: WatchlistTabsProps) {
  const tablistRef = useRef<HTMLDivElement>(null);

  function selectAndFocus(status: WatchlistStatus) {
    onSelect(status);
    // Every tab stays mounted, so the button is already in the DOM and can be
    // focused straight away — no effect needed.
    tablistRef.current?.querySelector<HTMLButtonElement>(`[data-status="${status}"]`)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = WATCHLIST_STATUSES.indexOf(active);
    const last = WATCHLIST_STATUSES.length - 1;

    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % WATCHLIST_STATUSES.length;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + WATCHLIST_STATUSES.length) % WATCHLIST_STATUSES.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = last;
        break;
      default:
        return;
    }

    event.preventDefault();
    selectAndFocus(WATCHLIST_STATUSES[nextIndex]);
  }

  return (
    <div
      ref={tablistRef}
      role="tablist"
      aria-label="Watchlist lists"
      onKeyDown={handleKeyDown}
      className="flex flex-wrap gap-2"
    >
      {WATCHLIST_STATUSES.map((status) => {
        const isActive = status === active;

        return (
          <button
            key={status}
            id={`watchlist-tab-${status}`}
            data-status={status}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls="watchlist-panel"
            // Roving tabindex: only the selected tab is reachable with Tab.
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(status)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none ${
              isActive
                ? "border-accent bg-accent text-white shadow-lg shadow-accent/25"
                : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-white/5 hover:text-zinc-100"
            }`}
          >
            {WATCHLIST_LABELS[status]}
            <span
              className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs ${
                isActive
                  ? "bg-white/25 text-white"
                  : "bg-white/10 text-zinc-300"
              }`}
            >
              {lists[status].length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
