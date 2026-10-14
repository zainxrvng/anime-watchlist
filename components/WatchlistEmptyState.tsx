interface WatchlistEmptyStateProps {
  /** The list's display name, so the message can name it. */
  label: string;
}

/** Shown when a list has nothing in it yet. */
export function WatchlistEmptyState({ label }: WatchlistEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 py-16 text-center">
      <span aria-hidden="true" className="text-4xl">
        📭
      </span>
      <h2 className="text-lg font-semibold text-zinc-100">Nothing in {label} yet</h2>
      <p className="max-w-sm text-sm text-zinc-400">
        Pick a status from the dropdown on any anime card and it will show up here.
      </p>
    </div>
  );
}
