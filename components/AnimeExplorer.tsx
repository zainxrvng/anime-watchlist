"use client";

import { useEffect, useState } from "react";

import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { ApiErrorResponse } from "@/types";
import type { Anime, AnimeListResult } from "@/types/anime";

import { AnimeGrid } from "./AnimeGrid";
import { AnimeGridSkeleton } from "./AnimeGridSkeleton";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadMoreButton } from "./LoadMoreButton";
import { SearchBar } from "./SearchBar";

/** How long typing must pause before we actually call the API. */
const SEARCH_DEBOUNCE_MS = 400;

type ViewState = "loading" | "ready" | "empty" | "error";

/**
 * One page of results from our own route handler.
 *
 * Omitting `q` asks for the top-ranked anime, which is what the home page
 * shows while the search box is empty.
 */
async function fetchAnimePage(
  query: string,
  page: number,
  signal?: AbortSignal,
): Promise<AnimeListResult> {
  const params = new URLSearchParams({ page: String(page) });
  if (query) {
    params.set("q", query);
  }

  const response = await fetch(`/api/anime?${params.toString()}`, { signal });
  const body: unknown = await response.json();

  if (!response.ok) {
    const failure = body as Partial<ApiErrorResponse>;
    throw new Error(failure.error ?? "Request failed");
  }

  return body as AnimeListResult;
}

/** Owns the search box, the fetch lifecycle, and which state is on screen. */
export function AnimeExplorer() {
  const [query, setQuery] = useState("");
  const [anime, setAnime] = useState<Anime[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  // Bumped by the retry button so it can re-run the effect without a new query.
  const [retryCount, setRetryCount] = useState(0);
  // Pagination state for the "Load more" button.
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  // Trimmed so a box full of spaces counts as "search is empty".
  const activeQuery = debouncedQuery.trim();

  useEffect(() => {
    // Aborting on cleanup stops a slow older request from overwriting the
    // results of a newer one while you keep typing.
    const controller = new AbortController();

    async function loadFirstPage(): Promise<void> {
      setViewState("loading");
      // A new query invalidates whatever "load more" had accumulated.
      setLoadMoreError("");
      setCurrentPage(1);

      try {
        const result = await fetchAnimePage(activeQuery, 1, controller.signal);
        setAnime(result.anime);
        setHasNextPage(result.pagination.hasNextPage);
        setErrorMessage("");
        setViewState(result.anime.length > 0 ? "ready" : "empty");
      } catch (error) {
        // An abort means we moved on to a newer query — not a real failure.
        if (controller.signal.aborted) {
          return;
        }

        setAnime([]);
        setHasNextPage(false);
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
        setViewState("error");
      }
    }

    void loadFirstPage();
    return () => controller.abort();
  }, [activeQuery, retryCount]);

  async function handleLoadMore(): Promise<void> {
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    setLoadMoreError("");

    try {
      const result = await fetchAnimePage(activeQuery, nextPage);
      // Pages can overlap if the ranking shifts between requests, so drop
      // anything already on screen rather than showing a title twice.
      setAnime((existing) => {
        const seen = new Set(existing.map((item) => item.id));
        return [...existing, ...result.anime.filter((item) => !seen.has(item.id))];
      });
      setCurrentPage(nextPage);
      setHasNextPage(result.pagination.hasNextPage);
    } catch (error) {
      // The button stays on screen, so this message is also the retry path.
      setLoadMoreError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Anime Watchlist
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {activeQuery ? `Results for “${activeQuery}”` : "Top ranked anime right now"}
          </p>
        </div>
        <SearchBar value={query} onChange={setQuery} />
      </header>

      <section>
        {viewState === "loading" && <AnimeGridSkeleton />}
        {viewState === "ready" && (
          <div className="flex flex-col gap-8">
            <AnimeGrid anime={anime} />
            {hasNextPage && (
              <LoadMoreButton
                onClick={handleLoadMore}
                isLoading={isLoadingMore}
                error={loadMoreError}
              />
            )}
          </div>
        )}
        {viewState === "empty" && <EmptyState query={activeQuery} />}
        {viewState === "error" && (
          <ErrorState detail={errorMessage} onRetry={() => setRetryCount((count) => count + 1)} />
        )}
      </section>
    </div>
  );
}
