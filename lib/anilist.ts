// Every AniList API call in this app lives in this file.
// Components import the three public functions below instead of calling
// fetch() themselves, so rate limiting, retries, and response shaping all
// stay in one testable place.
//
// AniList is a GraphQL API: one POST endpoint, and we name exactly the fields
// we need in the query so responses stay small.

import type {
  Anime,
  AnimeListResult,
  AnimePagination,
  RawAniListAnime,
  RawAniListErrorResponse,
  RawAniListItemResponse,
  RawAniListListResponse,
  RawAniListPage,
  RawAniListStatus,
} from "@/types/anime";

// `||` rather than `??`: Next.js replaces non-NEXT_PUBLIC vars with "" in the
// client bundle, and `??` would happily keep that empty string and produce a
// relative request URL instead of falling back to the real API.
const ANILIST_ENDPOINT = process.env.ANILIST_BASE_URL || "https://graphql.anilist.co";

/** Titles per page. AniList caps this at 50; the grid is built around 25. */
const PER_PAGE = 25;

/**
 * AniList allows roughly 90 requests a minute, so every request waits this
 * long — a little over 1.4 requests/second, leaving headroom.
 */
const MIN_REQUEST_INTERVAL_MS = 700;

/** Wait used when AniList sends no (or an unusable) Retry-After header. */
const DEFAULT_RETRY_DELAY_MS = 1000;

/** Never sleep longer than this between attempts, whatever AniList asks for. */
const MAX_RETRY_DELAY_MS = 5_000;

/** First attempt plus retries. Keeps a hard failure from looping forever. */
const MAX_ATTEMPTS = 3;

/**
 * Bound on a single attempt.
 *
 * Without this, a host that silently drops connections leaves `fetch` hanging
 * until the operating system gives up, and with retries that can hold a page
 * open for a minute before the error state ever appears. Five seconds is far
 * above AniList's normal response time.
 */
const REQUEST_TIMEOUT_MS = 5_000;

/** AniList's status enum, mapped to the wording the UI shows. */
const STATUS_LABELS: Record<RawAniListStatus, string> = {
  FINISHED: "Finished Airing",
  RELEASING: "Currently Airing",
  NOT_YET_RELEASED: "Not yet aired",
  CANCELLED: "Cancelled",
  HIATUS: "On Hiatus",
};

/** Failure of the AniList call itself, as opposed to a missing title. */
export class AniListApiError extends Error {
  /** Upstream status where one applies — 404 means "no such id". */
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AniListApiError";
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Request plumbing: rate limiting, retries, timeouts
// ---------------------------------------------------------------------------

/**
 * The next request must not start before this timestamp. Module scope, so the
 * limit applies to every caller in this process rather than per component —
 * otherwise parallel card renders would all fire together.
 */
let nextRequestAt = 0;

async function waitUntilSlot(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nextRequestAt - now);
  nextRequestAt = Math.max(now, nextRequestAt) + MIN_REQUEST_INTERVAL_MS;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert a Retry-After header into milliseconds.
 *
 * AniList sends either delta-seconds or an HTTP date; anything unparseable
 * falls back to a short fixed wait so a malformed header can't stall us.
 */
function retryAfterMs(response: Response, fallbackMs: number): number {
  const header = response.headers.get("retry-after");
  if (!header) {
    return fallbackMs;
  }

  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
  }

  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) {
    return Math.min(Math.max(0, asDate - Date.now()), MAX_RETRY_DELAY_MS);
  }

  return fallbackMs;
}

/** True for failures worth another attempt: network, timeout, 429, 5xx. */
function isRetryable(error: unknown, status?: number): boolean {
  if (status !== undefined) {
    return status === 429 || status >= 500;
  }
  return error instanceof Error;
}

/**
 * POST a GraphQL operation and return the parsed body.
 *
 * AniList reports failures through an `errors` array as well as HTTP status
 * codes, so both have to be inspected before this resolves.
 */
async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
  attempt = 1,
): Promise<T> {
  await waitUntilSlot();

  let response: Response;
  try {
    response = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      // Explicit no-store: watchlist/search data should never go stale.
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (networkError) {
    // AbortSignal.timeout() rejects with TimeoutError; a caller-cancelled
    // request rejects with AbortError. Either way the retry budget applies.
    if (attempt < MAX_ATTEMPTS && isRetryable(networkError)) {
      await delay(DEFAULT_RETRY_DELAY_MS);
      return graphql<T>(query, variables, attempt + 1);
    }

    const timedOut =
      networkError instanceof Error &&
      (networkError.name === "TimeoutError" || networkError.name === "AbortError");

    throw new AniListApiError(
      timedOut
        ? `Timed out after ${REQUEST_TIMEOUT_MS}ms requesting AniList`
        : `Network error requesting AniList: ${String(networkError)}`,
    );
  }

  // Rate limited: wait however long AniList asks, then try again.
  if (response.status === 429) {
    if (attempt < MAX_ATTEMPTS) {
      await delay(retryAfterMs(response, DEFAULT_RETRY_DELAY_MS));
      return graphql<T>(query, variables, attempt + 1);
    }
    throw new AniListApiError("AniList rate limit exceeded", 429);
  }

  // Other 4xx are our fault (bad query, bad id shape) — retrying won't help.
  if (!response.ok && response.status >= 400 && response.status < 500) {
    throw new AniListApiError(
      `AniList request failed with ${response.status}`,
      response.status,
    );
  }

  if (!response.ok) {
    if (attempt < MAX_ATTEMPTS) {
      await delay(DEFAULT_RETRY_DELAY_MS);
      return graphql<T>(query, variables, attempt + 1);
    }
    throw new AniListApiError(`AniList request failed with ${response.status}`, response.status);
  }

  const body = (await response.json()) as T & RawAniListErrorResponse;

  // AniList puts the reason in `errors`, and the HTTP status is usually 200 or
  // 400. "Not Found." is how a missing id surfaces on some query shapes.
  const firstError = body.errors?.[0];
  if (firstError) {
    const message = firstError.message ?? "AniList returned an error";
    const notFound = firstError.status === 404 || /not found/i.test(message);
    throw new AniListApiError(message, notFound ? 404 : firstError.status);
  }

  return body;
}

// ---------------------------------------------------------------------------
// Response mapping — raw AniList objects down to clean app objects
// ---------------------------------------------------------------------------

/**
 * AniList descriptions can carry `~!spoiler!~` markers, and older payloads
 * arrive as HTML. Both are flattened so the UI never has to parse markup.
 */
function toSynopsis(raw: string | null | undefined): string {
  if (!raw) {
    return "";
  }
  return raw
    // `[\s\S]` rather than `.` + the dotAll flag, which the TS target predates.
    .replace(/~!([\s\S]+?)!~/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert one raw AniList media object to the app's Anime shape. */
function toAnime(raw: RawAniListAnime): Anime {
  return {
    id: raw.id,
    // English title where AniList has one, otherwise the romanised original.
    title: raw.title?.english ?? raw.title?.romaji ?? "",
    image: raw.coverImage?.large ?? raw.coverImage?.extraLarge ?? "",
    // AniList scores out of 100; the app scores out of 10.
    score: raw.averageScore === null || raw.averageScore === undefined ? null : raw.averageScore / 10,
    episodes: raw.episodes ?? null,
    synopsis: toSynopsis(raw.description),
    // AniList already sends genre names as strings — no unwrapping needed.
    genres: raw.genres ?? [],
    status: raw.status ? (STATUS_LABELS[raw.status] ?? raw.status) : "Unknown",
    year: raw.seasonYear ?? raw.startDate?.year ?? null,
  };
}

/** Convert `data.Page` to the app's pagination shape. */
function toPagination(page: RawAniListPage | null | undefined, requestedPage: number): AnimePagination {
  return {
    currentPage: page?.pageInfo?.currentPage ?? requestedPage,
    lastVisiblePage: page?.pageInfo?.lastPage ?? requestedPage,
    hasNextPage: page?.pageInfo?.hasNextPage ?? false,
  };
}

// ---------------------------------------------------------------------------
// GraphQL operations
// ---------------------------------------------------------------------------

/** Fields every caller needs. Shared so the three queries can't drift apart. */
const MEDIA_FIELDS = /* GraphQL */ `
  id
  title { romaji english native }
  coverImage { large extraLarge }
  averageScore
  episodes
  description(asHtml: false)
  genres
  status
  seasonYear
  startDate { year }
`;

const LIST_QUERY = /* GraphQL */ `
  query TopAnime($page: Int) {
    Page(page: $page, perPage: ${PER_PAGE}) {
      pageInfo { currentPage lastPage hasNextPage }
      media(type: ANIME, sort: SCORE_DESC) { ${MEDIA_FIELDS} }
    }
  }
`;

const SEARCH_QUERY = /* GraphQL */ `
  query SearchAnime($page: Int, $search: String) {
    Page(page: $page, perPage: ${PER_PAGE}) {
      pageInfo { currentPage lastPage hasNextPage }
      media(type: ANIME, search: $search, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} }
    }
  }
`;

const MEDIA_QUERY = /* GraphQL */ `
  query AnimeById($id: Int) {
    Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} }
  }
`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search anime by title.
 *
 * @param query Free text; AniList matches titles as you type.
 * @param page  1-based results page, 25 per page.
 * @throws AniListApiError when AniList is unreachable or rate-limits past retrying.
 */
export async function searchAnime(query: string, page: number): Promise<AnimeListResult> {
  const body = await graphql<RawAniListListResponse>(SEARCH_QUERY, { page, search: query });
  const rawPage = body.data?.Page ?? null;

  return {
    anime: (rawPage?.media ?? []).map(toAnime),
    pagination: toPagination(rawPage, page),
  };
}

/**
 * Fetch one anime by id.
 *
 * @throws AniListApiError with status 404 when the id does not exist.
 */
export async function getAnimeById(id: number): Promise<Anime> {
  const body = await graphql<RawAniListItemResponse>(MEDIA_QUERY, { id });
  const raw = body.data?.Media;

  // AniList answers an unknown id with a null Media rather than an HTTP 404.
  if (!raw) {
    throw new AniListApiError(`Anime ${id} was not found`, 404);
  }

  return toAnime(raw);
}

/**
 * Fetch AniList's current top-rated anime.
 *
 * @param page 1-based results page; AniList paginates the ranking.
 * @throws AniListApiError when AniList is unreachable or rate-limits past retrying.
 */
export async function getTopAnime(page: number): Promise<AnimeListResult> {
  const body = await graphql<RawAniListListResponse>(LIST_QUERY, { page });
  const rawPage = body.data?.Page ?? null;

  return {
    anime: (rawPage?.media ?? []).map(toAnime),
    pagination: toPagination(rawPage, page),
  };
}
