"use client";

import Image from "next/image";
import Link from "next/link";

import { WatchlistControl } from "@/components/WatchlistControl";
import { useTilt } from "@/lib/useTilt";
import type { Anime } from "@/types/anime";

interface AnimeCardProps {
  anime: Anime;
  /**
   * True for the first card in the grid. That poster is the page's LCP, so it
   * needs `loading="eager"` — the default `next/image` lazy-loads, which asks
   * the browser to defer the one paint that matters most.
   */
  priority?: boolean;
}

/** Poster, title, score and episode count for a single anime. */
export function AnimeCard({ anime, priority = false }: AnimeCardProps) {
  // AniList leaves these null for ongoing or unannounced titles — show it plainly.
  const scoreLabel = anime.score === null ? "N/A" : anime.score.toFixed(1);
  const episodeLabel = anime.episodes === null ? "?" : `${anime.episodes} ep`;

  // Cursor-following tilt. The angles land in CSS custom properties rather
  // than state, so tracking the pointer never triggers a React render.
  const { ref, onPointerMove, onPointerLeave } = useTilt<HTMLElement>(8);

  return (
    // Deliberately no overflow-hidden on the card: the status menu inside it
    // has to be able to hang past the edge.
    //
    // `.card-tilt` puts a transform on the card, and a transform makes the card
    // a stacking context — so once the card is one, *its own* z-index decides
    // who wins the hit-test, and hover/focus-within raising that z-index is
    // what keeps an open menu clickable while it overhangs a neighbour below.
    //
    // The transition list is explicit (and pointedly excludes z-index):
    // `transition-all` would animate the z-index raise over 300ms, leaving a
    // window where the card still sits at z=0 and the link overlay underneath
    // swallows clicks meant for the open menu. Here the raise lands instantly
    // while the tilt and lift ease, which is the whole point of listing them.
    // focus-within gives keyboard users the same lift.
    <article
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="card-tilt group relative flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 transition-[translate,transform,border-color,background-color,box-shadow] duration-300 ease-out hover:z-10 hover:-translate-y-1.5 hover:border-accent/40 hover:bg-zinc-900/70 hover:shadow-2xl hover:shadow-accent/10 focus-within:z-10 focus-within:-translate-y-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-800">
        {anime.image ? (
          <Image
            src={anime.image}
            alt={`${anime.title} poster`}
            fill
            priority={priority}
            // Matches the grid: 50vw at 2 cols, up to 20vw at 5 cols.
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          // AniList sometimes omits artwork; keep the card the same size anyway.
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
            No image
          </div>
        )}
      </div>

      {/*
        The link is anchored on the title but stretched over the whole card with
        an ::after overlay, so the poster and background are clickable too.
        Anchoring on the text rather than wrapping the card keeps the status
        <button> out of the link's subtree (a link may not contain interactive
        content) and leaves screen readers a clean accessible name: the title.
      */}
      <h3 className="line-clamp-2 text-sm font-medium">
        <Link
          href={`/anime/${anime.id}`}
          className="text-zinc-100 transition-colors after:absolute after:inset-0 after:content-[''] hover:text-white focus-visible:outline-none"
        >
          {anime.title}
        </Link>
      </h3>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span className="font-medium text-amber-400">★ {scoreLabel}</span>
        <span>{episodeLabel}</span>
      </div>

      {/* Raised above the stretched link, or the overlay would swallow clicks. */}
      <div className="relative z-10">
        <WatchlistControl anime={anime} />
      </div>
    </article>
  );
}
