// Anime domain types for the watchlist.
//
// Two layers live in this file:
//   1. Clean app types (Anime, AnimeListResult) — camelCase, limited to the
//      fields the UI actually needs. Components consume only these.
//   2. Raw AniList wire types (RawAniList*) — the exact GraphQL shapes AniList
//      returns. Only lib/anilist.ts reads them, then maps them down to layer 1.

// ---------------------------------------------------------------------------
// Clean app types
// ---------------------------------------------------------------------------

/** One anime, simplified to exactly the fields this app displays. */
export interface Anime {
  /** AniList id, e.g. 154587 for "Sousou no Frieren". */
  id: number;
  title: string;
  /** Absolute URL of the poster image; empty string when unavailable. */
  image: string;
  /** Community score out of 10; null while AniList has no rating yet. */
  score: number | null;
  /** Total episode count; null for ongoing or unannounced anime. */
  episodes: number | null;
  synopsis: string;
  /** Genre names only, e.g. ["Action", "Adventure"] — already plain strings. */
  genres: string[];
  /** e.g. "Finished Airing", "Currently Airing", "Not yet aired". */
  status: string;
  /** Release year; null when AniList doesn't know it. */
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
// Raw AniList wire types — internal to lib/anilist.ts
// ---------------------------------------------------------------------------

/** AniList returns the three title variants together; we pick one. */
export interface RawAniListTitle {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
}

export interface RawAniListCoverImage {
  large?: string | null;
  extraLarge?: string | null;
}

export interface RawAniListStartDate {
  year?: number | null;
}

/** The full set of values AniList's `Media.status` can take. */
export type RawAniListStatus =
  | "FINISHED"
  | "RELEASING"
  | "NOT_YET_RELEASED"
  | "CANCELLED"
  | "HIATUS";

/** A single anime object exactly as AniList returns it. */
export interface RawAniListAnime {
  id: number;
  title?: RawAniListTitle | null;
  coverImage?: RawAniListCoverImage | null;
  /** 0-100, or null when nobody has rated it yet. */
  averageScore?: number | null;
  episodes?: number | null;
  /** Plain text when requested with `description(asHtml: false)`. */
  description?: string | null;
  /** AniList sends genre names as a flat string array — no wrapper objects. */
  genres?: string[] | null;
  status?: RawAniListStatus | null;
  seasonYear?: number | null;
  startDate?: RawAniListStartDate | null;
}

/** `data.Page` from a list or search query. */
export interface RawAniListPage {
  pageInfo?: {
    currentPage?: number | null;
    lastPage?: number | null;
    hasNextPage?: boolean | null;
  } | null;
  media?: RawAniListAnime[] | null;
}

/** Body of AniList's Page queries: top list and search. */
export interface RawAniListListResponse {
  data?: { Page?: RawAniListPage | null } | null;
}

/** Body of AniList's single-Media query. */
export interface RawAniListItemResponse {
  data?: { Media?: RawAniListAnime | null } | null;
}

/**
 * AniList reports failures through this array rather than only an HTTP status,
 * and a query can return both a partial `data` and `errors` at once.
 */
export interface RawAniListError {
  message?: string;
  /** Present on validation and "not found" style failures. */
  status?: number;
  validation?: string[];
}

export interface RawAniListErrorResponse {
  errors?: RawAniListError[];
}
