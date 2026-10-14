import type { Anime } from "./anime";

/** The three lists a title can belong to, in the order they're displayed. */
export const WATCHLIST_STATUSES = ["watching", "planToWatch", "completed"] as const;

export type WatchlistStatus = (typeof WATCHLIST_STATUSES)[number];

/**
 * Runtime guard for values arriving from outside the type system — a `?list=`
 * query parameter, or hand-edited localStorage.
 */
export function isWatchlistStatus(value: unknown): value is WatchlistStatus {
  return typeof value === "string" && (WATCHLIST_STATUSES as readonly string[]).includes(value);
}

/** Display names, shared by the card dropdown and the watchlist page tabs. */
export const WATCHLIST_LABELS: Record<WatchlistStatus, string> = {
  watching: "Watching",
  planToWatch: "Plan to Watch",
  completed: "Completed",
};

/** A title, the list it sits in, and when it was put there. */
export interface WatchlistEntry {
  anime: Anime;
  status: WatchlistStatus;
  /** Epoch ms of the last add or move, so the newest item sorts first. */
  addedAt: number;
}

/**
 * Flat map keyed by anime id. Keying by id makes it structurally impossible
 * for one title to sit in two lists at once, which a Record<status, Anime[]>
 * would happily allow and then have to keep in sync by hand.
 */
export type WatchlistEntries = Record<number, WatchlistEntry>;
