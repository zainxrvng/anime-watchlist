import type { Anime } from "@/types/anime";

import { AnimeCard } from "./AnimeCard";

/**
 * Column counts: 2 on phones, then 3/4/5 as the viewport grows.
 * Exported so the loading skeleton uses the exact same layout.
 */
export const ANIME_GRID_CLASSES =
  "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

interface AnimeGridProps {
  anime: Anime[];
}

/** Responsive grid of anime cards. */
export function AnimeGrid({ anime }: AnimeGridProps) {
  return (
    <div className={ANIME_GRID_CLASSES}>
      {anime.map((item) => (
        <AnimeCard key={item.id} anime={item} />
      ))}
    </div>
  );
}
