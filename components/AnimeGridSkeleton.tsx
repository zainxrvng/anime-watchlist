import { ANIME_GRID_CLASSES } from "./AnimeGrid";

/** Enough cards to fill two rows on the widest layout, so nothing jumps. */
const SKELETON_CARD_COUNT = 10;

/** Placeholder grid shown while a request is in flight. */
export function AnimeGridSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading anime…</span>
      <div className={ANIME_GRID_CLASSES} aria-hidden="true">
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="aspect-[2/3] w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
