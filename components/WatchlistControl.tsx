"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { toast } from "@/lib/toast";
import { useWatchlist } from "@/lib/useWatchlist";
import type { Anime } from "@/types/anime";
import {
  WATCHLIST_LABELS,
  WATCHLIST_STATUSES,
  type WatchlistStatus,
} from "@/types/watchlist";

/**
 * One colour per list so membership reads at a glance. Violet is deliberately
 * absent — it's the app-wide accent, and reusing it here would make
 * "Plan to Watch" look like a generic control.
 */
const STATUS_STYLES: Record<WatchlistStatus, string> = {
  watching: "border-sky-400/40 bg-sky-500/15 text-sky-200",
  planToWatch: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  completed: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
};

const TRIGGER_BASE =
  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

const ITEM_CLASS =
  "flex w-full items-center justify-between px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none";

interface WatchlistControlProps {
  anime: Anime;
}

/**
 * Dropdown that adds, moves or removes a title across the three lists.
 *
 * Used on the home cards, the detail page and the watchlist page — the only
 * place a title's status is ever changed.
 */
export function WatchlistControl({ anime }: WatchlistControlProps) {
  const { addToList, removeFromList, getStatus } = useWatchlist();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentStatus = getStatus(anime.id);

  // Clicking anywhere outside the open menu dismisses it.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  function menuItems(): HTMLElement[] {
    return Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitemradio"], [role="menuitem"]',
      ) ?? [],
    );
  }

  // Opening lands focus on the first option, so the arrow keys below work
  // straight away without the user having to Tab into the menu.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    containerRef.current
      ?.querySelectorAll<HTMLElement>('[role="menuitemradio"], [role="menuitem"]')[0]
      ?.focus();
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
    // Hand focus back so keyboard users aren't dropped at the top of the page.
    triggerRef.current?.focus();
  }

  function choose(status: WatchlistStatus) {
    const wasSaved = currentStatus !== null;
    addToList(anime, status);
    toast(
      `${wasSaved ? "Moved" : "Added"} “${anime.title}” to ${WATCHLIST_LABELS[status]}`,
    );
    closeMenu();
  }

  function remove() {
    removeFromList(anime.id);
    toast(`Removed “${anime.title}” from your watchlist`);
    closeMenu();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isOpen) {
      // Arrow keys on the closed trigger open it, like a native <select>.
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (event.key === "Escape") {
      closeMenu();
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    // Roving focus through the options, wrapping at both ends.
    const items = menuItems();
    if (items.length === 0) {
      return;
    }
    event.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const next = index === -1 ? 0 : (index + delta + items.length) % items.length;
    items[next].focus();
  }

  const label = currentStatus ? WATCHLIST_LABELS[currentStatus] : "Add to watchlist";

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`${TRIGGER_BASE} ${
          currentStatus
            ? STATUS_STYLES[currentStatus]
            : "border-dashed border-zinc-600 text-zinc-400 hover:border-accent/60 hover:text-zinc-100"
        }`}
      >
        <span className="truncate">{label}</span>
        <span aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <ul
          role="menu"
          className="absolute right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/40"
        >
          {WATCHLIST_STATUSES.map((status) => (
            <li key={status} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={status === currentStatus}
                onClick={() => choose(status)}
                className={ITEM_CLASS}
              >
                {WATCHLIST_LABELS[status]}
                {status === currentStatus && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}

          {currentStatus && (
            <li role="none" className="border-t border-zinc-700">
              <button
                type="button"
                role="menuitem"
                onClick={remove}
                className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 focus-visible:bg-red-500/10 focus-visible:outline-none"
              >
                Remove from watchlist
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
