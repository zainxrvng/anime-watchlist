// Anime domain types for the watchlist.
//
// Two layers live in this file:
//   1. Clean app types (Anime, AnimeListResult) — camelCase, limited to the
//      fields the UI actually needs. Components consume only these.
//   2. Raw Jikan wire types (RawJikan*) — the snake_case shapes Jikan really
//      sends. Only lib/jikan.ts reads them, then maps them down to layer 1.

import type { JikanListResponse, JikanResponse } from "@/types";

// ---------------------------------------------------------------------------
// Clean app types
// ---------------------------------------------------------------------------

/** One anime, simplified to exactly the fields this app displays. */
export interface Anime {
  /** MyAnimeList id, e.g. 20 for "Naruto". */
  id: number;
  title: string;
  /** Absolute URL of the poster image; empty string when unavailable. */
  image: string;
  /** Community score out of 10; null while Jikan has no score yet. */
  score: number | null;
  /** Total episode count; null for ongoing or unannounced anime. */
  episodes: number | null;
  synopsis: string;
  /** Genre names only, e.g. ["Action", "Adventure"] — not Jikan's objects. */
  genres: string[];
  /** e.g. "Finished Airing", "Currently Airing", "Not yet aired". */
  status: string;
  /** Release year; null when Jikan doesn't know it (older/unknown titles). */
  year: number | null;
}

/** Paging info returned alongside a list of anime, in camelCase. */
export interface AnimePagination {
  currentPage: number;
  lastVisiblePage: number;
  hasNextPage: boolean;
}

/** What searchAnime() and getTopAnime() resolve to. */
export interface AnimeListResult {
  anime: Anime[];
  pagination: AnimePagination;
}

// ---------------------------------------------------------------------------
// Raw Jikan wire types — internal to lib/jikan.ts
// ---------------------------------------------------------------------------

/** Jikan ships several image formats; we only ever need one URL. */
export interface RawJikanImages {
  jpg?: { image_url?: string };
  webp?: { image_url?: string };
}

export interface RawJikanGenre {
  mal_id: number;
  name: string;
  type?: string;
}

/** A single anime object exactly as Jikan returns it. */
export interface RawJikanAnime {
  mal_id: number;
  title?: string;
  images?: RawJikanImages;
  score?: number | null;
  episodes?: number | null;
  synopsis?: string | null;
  genres?: RawJikanGenre[] | null;
  status?: string | null;
  year?: number | null;
}

/** Body of Jikan's list endpoints: /anime search and /top/anime. */
export type RawJikanListResponse = JikanListResponse<RawJikanAnime>;

/** Body of Jikan's single-anime endpoint: /anime/{id}. */
export type RawJikanItemResponse = JikanResponse<RawJikanAnime>;
