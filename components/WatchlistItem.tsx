import Image from "next/image";

import { WatchlistControl } from "@/components/WatchlistControl";
import type { Anime } from "@/types/anime";

interface WatchlistItemProps {
  anime: Anime;
}

/** Compact row for one saved title, with the controls to move or remove it. */
export function WatchlistItem({ anime }: WatchlistItemProps) {
  const scoreLabel = anime.score === null ? "N/A" : anime.score.toFixed(1);
  const episodeLabel = anime.episodes === null ? "?" : `${anime.episodes} ep`;

  return (
    <li className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70">
      <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
        {anime.image ? (
          <Image
            src={anime.image}
            alt={`${anime.title} poster`}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          // Jikan sometimes omits artwork; keep the row the same size anyway.
          <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
            No image
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="line-clamp-2 text-sm font-medium text-zinc-100">{anime.title}</h3>
        <p className="text-xs text-zinc-400">
          <span className="font-medium text-amber-400">★ {scoreLabel}</span>
          <span className="mx-2">·</span>
          <span>{episodeLabel}</span>
        </p>
        <WatchlistControl anime={anime} />
      </div>
    </li>
  );
}
