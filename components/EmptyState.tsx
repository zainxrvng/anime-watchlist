interface EmptyStateProps {
  /** The trimmed search term, or "" when the top list itself was empty. */
  query: string;
}

/** Friendly message for "the request worked, there just was nothing in it". */
export function EmptyState({ query }: EmptyStateProps) {
  const isSearch = query.length > 0;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 py-16 text-center">
      <span aria-hidden="true" className="text-4xl">
        🔍
      </span>
      <h2 className="text-lg font-semibold text-zinc-100">
        {isSearch ? `No anime matched “${query}”` : "Nothing to show right now"}
      </h2>
      <p className="max-w-sm text-sm text-zinc-400">
        {isSearch
          ? "Check the spelling, or try a shorter or more general title."
          : "AniList returned no results — try again in a moment."}
      </p>
    </div>
  );
}
