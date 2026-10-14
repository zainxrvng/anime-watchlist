import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { Anime } from "@/types/anime";
import type { WatchlistEntries, WatchlistEntry, WatchlistStatus } from "@/types/watchlist";
import { isWatchlistStatus, WATCHLIST_STATUSES } from "@/types/watchlist";

/**
 * Versioned so a future shape change can migrate instead of silently breaking.
 *
 * v2: ids switched from MyAnimeList to AniList. The two are unrelated
 * numbering schemes for the same shows, so entries saved under v1 point at
 * ids this app can no longer resolve — better to start clean than show
 * rows whose detail links all404.
 */
const STORAGE_KEY = "anime-watchlist:v2";

/** What the server renders, and the value an empty client store starts from. */
const EMPTY_ENTRIES: WatchlistEntries = Object.freeze({});

const listeners = new Set<() => void>();

/**
 * Cached between renders. useSyncExternalStore compares snapshots by
 * reference, so a getSnapshot that built a fresh object on every call would
 * schedule a re-render that schedules another re-render, forever.
 */
let cachedEntries: WatchlistEntries | null = null;

function parseJson(raw: string | null): unknown {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    // Corrupt JSON; sanitizeEntries() below turns this into an empty store.
    return null;
  }
}

/** Keeps only well-formed entries, so hand-edited storage can't crash the UI. */
function sanitizeEntries(value: unknown): WatchlistEntries {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return EMPTY_ENTRIES;
  }

  const clean: WatchlistEntries = {};
  for (const candidate of Object.values(value)) {
    if (typeof candidate !== "object" || candidate === null) {
      continue;
    }
    const entry = candidate as Partial<WatchlistEntry>;
    const { anime } = entry;
    if (
      anime !== undefined &&
      typeof anime.id === "number" &&
      isWatchlistStatus(entry.status) &&
      typeof entry.addedAt === "number"
    ) {
      clean[anime.id] = { anime, status: entry.status, addedAt: entry.addedAt };
    }
  }
  return clean;
}

/** Reads localStorage once per session, then reuses the cached object. */
function readEntries(): WatchlistEntries {
  if (cachedEntries === null) {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable — private mode, or cookies blocked.
    }
    cachedEntries = sanitizeEntries(parseJson(raw));
  }
  return cachedEntries;
}

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function commit(next: WatchlistEntries): void {
  cachedEntries = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or a blocked store: keep the change in memory so the
    // session still works, it just won't survive a reload.
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // A second browser tab writing the same key should update this one too.
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function handleStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) {
    return;
  }
  cachedEntries = sanitizeEntries(parseJson(event.newValue));
  emit();
}

function getClientSnapshot(): WatchlistEntries {
  return readEntries();
}

/**
 * The server can't read localStorage, so it renders this empty value and the
 * client matches it during hydration. React swaps in the real snapshot once
 * hydration finishes, which is what keeps the mismatch warning away.
 */
function getServerSnapshot(): WatchlistEntries {
  return EMPTY_ENTRIES;
}

/** Titles grouped by list, each list sorted newest-first. */
function buildLists(entries: WatchlistEntries): Record<WatchlistStatus, Anime[]> {
  const grouped: Record<WatchlistStatus, WatchlistEntry[]> = {
    watching: [],
    planToWatch: [],
    completed: [],
  };
  for (const entry of Object.values(entries)) {
    grouped[entry.status].push(entry);
  }

  const newestFirst = (a: WatchlistEntry, b: WatchlistEntry) => b.addedAt - a.addedAt;
  const titlesByStatus = {} as Record<WatchlistStatus, Anime[]>;
  for (const status of WATCHLIST_STATUSES) {
    titlesByStatus[status] = grouped[status].sort(newestFirst).map((entry) => entry.anime);
  }
  return titlesByStatus;
}

/**
 * Watchlist store backed by localStorage.
 *
 * The state lives outside React (a module-level cache) and React subscribes
 * to it via useSyncExternalStore. That gives us the SSR-safe behaviour and
 * the cross-tab syncing for free, without an effect that would render an
 * empty list first and flash the real one a frame later.
 */
export function useWatchlist() {
  const entries = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const lists = useMemo(() => buildLists(entries), [entries]);

  const addToList = useCallback((anime: Anime, status: WatchlistStatus) => {
    commit({ ...readEntries(), [anime.id]: { anime, status, addedAt: Date.now() } });
  }, []);

  const moveToList = useCallback((animeId: number, status: WatchlistStatus) => {
    const existing = readEntries()[animeId];
    // Never invent an entry for an id we haven't saved — it would render blank.
    if (!existing) {
      return;
    }
    // Bumping addedAt is what pushes it to the top of the destination list.
    commit({ ...readEntries(), [animeId]: { ...existing, status, addedAt: Date.now() } });
  }, []);

  const removeFromList = useCallback((animeId: number) => {
    const current = readEntries();
    if (!current[animeId]) {
      return;
    }
    const next = { ...current };
    delete next[animeId];
    commit(next);
  }, []);

  // Derived from the snapshot React handed this render, so it can never
  // disagree with what's on screen.
  const getStatus = useCallback(
    (animeId: number): WatchlistStatus | null => entries[animeId]?.status ?? null,
    [entries],
  );

  return { lists, addToList, moveToList, removeFromList, getStatus };
}
