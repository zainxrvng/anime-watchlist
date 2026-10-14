// Every Jikan API call in this app lives in this file.
// Components import the three public functions below instead of calling
// fetch() themselves, so rate limiting, retries, and response shaping all
// stay in one testable place.

import type {
  Anime,
  AnimeListResult,
  RawJikanAnime,
  RawJikanItemResponse,
  RawJikanListResponse,
} from "@/types/anime";

// `||` rather than `??`: Next.js replaces non-NEXT_PUBLIC vars with "" in the
// client bundle, and `??` would happily keep that empty string and produce
// relative request URLs instead of falling back to the real API.
const JIKAN_BASE_URL = process.env.JIKAN_BASE_URL || "https://api.jikan.moe/v4";

/** Jikan allows ~3 requests/second, so every request waits this long. */
const MIN_REQUEST_INTERVAL_MS = 350;

/** Wait used when Jikan sends no (or an unusable) Retry-After header. */
const DEFAULT_RETRY_DELAY_MS = 1000;

/** Never sleep longer than this between attempts, whatever Jikan asks for. */
const MAX_RETRY_DELAY_MS = 5_000;

/** First attempt plus retries. Keeps a hard failure from looping forever. */
const MAX_ATTEMPTS = 3;

/** Thrown once a request has failed for good, so callers can branch on it. */
export class JikanApiError extends Error {
  /** HTTP status of the failure, or undefined if the request never landed. */
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "JikanApiError";
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

// The moment the next request is allowed to fire. It is advanced
// synchronously, so concurrent callers reserve distinct slots instead of all
// firing together and tripping Jikan's 3-per-second limit.
let nextRequestSlotMs = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Space requests out so we stay inside Jikan's 3-requests/second budget. */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const scheduledAtMs = Math.max(now, nextRequestSlotMs);
  nextRequestSlotMs = scheduledAtMs + MIN_REQUEST_INTERVAL_MS;
  await delay(scheduledAtMs - now);
}

// ---------------------------------------------------------------------------
// Request + retry
// ---------------------------------------------------------------------------

/**
 * Convert Jikan's Retry-After hint (delta-seconds) into milliseconds.
 * The header may instead be an HTTP date, which we don't parse — we just
 * fall back to the default delay. The result is capped so one huge header
 * can't stall the app for minutes.
 */
function retryDelayMs(response: Response): number {
  const header = response.headers.get("retry-after")?.trim();
  const seconds = header ? Number(header) : Number.NaN;

  if (!Number.isFinite(seconds) || seconds < 0) {
    return DEFAULT_RETRY_DELAY_MS;
  }
  return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
}

/**
 * Fetch a Jikan path and return its parsed JSON body.
 *
 * Transient failures (429 rate limit, 5xx, network drop) are retried after a
 * short delay. Other 4xx responses mean the request itself is wrong — a 404
 * for an unknown id will never become a 200 — so those fail immediately.
 *
 * @param path Endpoint path relative to the base, e.g. "/anime/20".
 */
async function requestJson<T>(path: string, attempt = 1): Promise<T> {
  await waitForRateLimit();

  let response: Response;
  try {
    // Explicit no-store: watchlist/search data should never go stale.
    response = await fetch(`${JIKAN_BASE_URL}${path}`, { cache: "no-store" });
  } catch (networkError) {
    if (attempt < MAX_ATTEMPTS) {
      await delay(DEFAULT_RETRY_DELAY_MS);
      return requestJson<T>(path, attempt + 1);
    }
    throw new JikanApiError(`Network error requesting ${path}: ${String(networkError)}`);
  }

  const isTransient = response.status === 429 || response.status >= 500;
  if (isTransient && attempt < MAX_ATTEMPTS) {
    await delay(retryDelayMs(response));
    return requestJson<T>(path, attempt + 1);
  }

  if (!response.ok) {
    throw new JikanApiError(
      `Jikan request failed with ${response.status} for ${path}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Response mapping — raw Jikan objects down to clean app objects
// ---------------------------------------------------------------------------

/** Keep only the fields the app uses, filling gaps with sensible defaults. */
function toAnime(raw: RawJikanAnime): Anime {
  return {
    id: raw.mal_id,
    title: raw.title ?? "Untitled",
    // Prefer jpg; fall back to webp when a title has no jpg asset.
    image: raw.images?.jpg?.image_url ?? raw.images?.webp?.image_url ?? "",
    score: raw.score ?? null,
    episodes: raw.episodes ?? null,
    synopsis: raw.synopsis ?? "",
    // Genres arrive as objects; only their names matter to the UI.
    genres: (raw.genres ?? []).map((genre) => genre.name),
    status: raw.status ?? "Unknown",
    year: raw.year ?? null,
  };
}

/** Unwrap a list body plus its snake_case pagination into a clean result. */
function toAnimeList(raw: RawJikanListResponse): AnimeListResult {
  return {
    anime: (raw.data ?? []).map((item) => toAnime(item)),
    pagination: {
      currentPage: raw.pagination?.current_page ?? 1,
      lastVisiblePage: raw.pagination?.last_visible_page ?? 1,
      hasNextPage: raw.pagination?.has_next_page ?? false,
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search anime by title.
 *
 * @param query Free-text title search, e.g. "naruto".
 * @param page  1-based results page; Jikan returns up to 25 per page.
 */
export async function searchAnime(query: string, page = 1): Promise<AnimeListResult> {
  const params = new URLSearchParams({ q: query, page: String(page) });
  const body = await requestJson<RawJikanListResponse>(`/anime?${params}`);
  return toAnimeList(body);
}

/**
 * Fetch one anime by its MyAnimeList id.
 *
 * @throws JikanApiError with status 404 when the id does not exist.
 */
export async function getAnimeById(id: number): Promise<Anime> {
  const body = await requestJson<RawJikanItemResponse>(`/anime/${id}`);

  // A 200 with no payload should not slip through as a half-built object.
  if (!body.data) {
    throw new JikanApiError(`Anime ${id} was not found`, 404);
  }

  return toAnime(body.data);
}

/**
 * Fetch Jikan's current top-rated anime.
 *
 * @param page 1-based results page; Jikan paginates the ranking.
 */
export async function getTopAnime(page = 1): Promise<AnimeListResult> {
  const body = await requestJson<RawJikanListResponse>(`/top/anime?page=${page}`);
  return toAnimeList(body);
}
