import Image from "next/image";

import { WatchlistControl } from "@/components/WatchlistControl";
import type { Anime } from "@/types/anime";

interface AnimeCardProps {
  anime: Anime;
}

/** Poster, title, score and episode count for a single anime. */
export function AnimeCard({ anime }: AnimeCardProps) {
  // Jikan leaves these null for ongoing or unannounced titles — show it plainly.
  const scoreLabel = anime.score === null ? "N/A" : anime.score.toFixed(1);
  const episodeLabel = anime.episodes === null ? "?" : `${anime.episodes} ep`;

  return (
    // Deliberately no overflow-hidden on the card: the status menu inside it
    // has to be able to hang past the edge. hover:z-10 raises the card in the
    // stacking context so an open menu paints over its neighbours rather than
    // sliding behind them, and focus-within gives keyboard users the same lift.
    <article className="group relative z-0 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 transition-all duration-300 ease-out hover:z-10 hover:-translate-y-1.5 hover:border-accent/40 hover:bg-zinc-900/70 hover:shadow-2xl hover:shadow-accent/10 focus-within:z-10 focus-within:-translate-y-1.5 focus-within:border-accent/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-800">
        {anime.image ? (
          <Image
            src={anime.image}
            alt={`${anime.title} poster`}
            fill
            // Matches the grid: 50vw at 2 cols, up to 20vw at 5 cols.
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          // Jikan sometimes omits artwork; keep the card the same size anyway.
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
            No image
          </div>
        )}
      </div>

      <h3 className="line-clamp-2 text-sm font-medium text-zinc-100">{anime.title}</h3>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span className="font-medium text-amber-400">★ {scoreLabel}</span>
        <span>{episodeLabel}</span>
      </div>

      <WatchlistControl anime={anime} />
    </article>
  );
}
