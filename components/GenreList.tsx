interface GenreListProps {
  genres: string[];
}

/** Genre names as wrapping chips. Renders nothing when a title has none. */
export function GenreList({ genres }: GenreListProps) {
  if (genres.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Genres</h2>
      {/* Chips wrap onto their own row on narrow screens instead of clipping. */}
      <ul className="flex flex-wrap gap-2">
        {genres.map((genre) => (
          <li
            key={genre}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-accent/50 hover:text-zinc-100"
          >
            {genre}
          </li>
        ))}
      </ul>
    </section>
  );
}
