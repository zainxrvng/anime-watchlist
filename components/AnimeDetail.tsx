import Image from "next/image";

import type { Anime } from "@/types/anime";

import { BackButton } from "./BackButton";
import { GenreList } from "./GenreList";
import { WatchlistControl } from "./WatchlistControl";

interface AnimeDetailProps {
  anime: Anime;
}

/** Full detail view: poster beside a column of facts and synopsis. */
export function AnimeDetail({ anime }: AnimeDetailProps) {
  const facts = [
    { label: "Score", value: anime.score === null ? "Not yet rated" : `★ ${anime.score.toFixed(1)}` },
    { label: "Status", value: anime.status },
    { label: "Year", value: anime.year === null ? "Unknown" : String(anime.year) },
  ];

  return (
    <article className="flex flex-col gap-6">
      <BackButton label="Back to search" />

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        {/* Poster: modest centred width on phones, fixed column from md up. */}
        <div className="w-44 shrink-0 self-center sm:w-56 md:w-72 md:self-start">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-800 shadow-2xl shadow-black/40">
            {anime.image ? (
              <Image
                src={anime.image}
                alt={`${anime.title} poster`}
                fill
                priority
                sizes="(min-width: 768px) 288px, (min-width: 640px) 224px, 176px"
                className="object-cover"
              />
            ) : (
              // AniList sometimes omits artwork; keep the layout intact anyway.
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                No image
              </div>
            )}
          </div>
        </div>

        {/* min-w-0 lets long titles and paragraphs shrink inside the flex row. */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <header className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold break-words text-zinc-50 sm:text-3xl">
              {anime.title}
            </h1>
            <ul className="flex flex-wrap gap-2">
              {facts.map((fact) => (
                <li
                  key={fact.label}
                  className="flex items-baseline gap-1.5 rounded-full border border-zinc-800 bg-white/5 px-3 py-1 text-sm"
                >
                  <span className="text-zinc-400">{fact.label}</span>
                  <span className="font-medium text-zinc-100">{fact.value}</span>
                </li>
              ))}
            </ul>
          </header>

          {/* Constrained so the button doesn't stretch across the whole column. */}
          <div className="max-w-56">
            <WatchlistControl anime={anime} />
          </div>

          <GenreList genres={anime.genres} />

          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Synopsis
            </h2>
            {anime.synopsis ? (
              <p className="text-sm leading-6 text-zinc-300">{anime.synopsis}</p>
            ) : (
              <p className="text-sm text-zinc-500">
                No synopsis is available for this title yet.
              </p>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}
