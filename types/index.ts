/**
 * Shared type definitions for the anime watchlist.
 *
 * Any type used by more than one file belongs here. Types that only a single
 * component needs can stay private to that component's file.
 */

/** Error body returned by this app's own route handlers. */
export interface ApiErrorResponse {
  error: string;
}
