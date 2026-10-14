/**
 * Shared type definitions for the anime watchlist.
 *
 * Any type used by more than one file belongs here. Types that only a single
 * component needs can stay private to that component's file.
 */

/** Every Jikan v4 endpoint wraps its payload in a `data` field. */
export interface JikanResponse<T> {
  data: T;
}

/** Pagination metadata attached to endpoints that return a list of results. */
export interface JikanPagination {
  last_visible_page: number;
  has_next_page: boolean;
  /** Only present when the request supplied a `page` query parameter. */
  current_page?: number;
}

/** List/search responses combine the array payload with pagination info. */
export interface JikanListResponse<T> extends JikanResponse<T[]> {
  pagination: JikanPagination;
}

/** Error body returned by this app's own route handlers. */
export interface ApiErrorResponse {
  error: string;
}
