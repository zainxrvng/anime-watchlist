interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
  /** Non-empty when the last attempt failed; the button doubles as retry. */
  error: string;
}

/**
 * Fetches the next page of results and appends them.
 *
 * Shown only while the API says there is another page, so there is no "load
 * more" dead end on the final page.
 */
export function LoadMoreButton({ onClick, isLoading, error }: LoadMoreButtonProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        aria-busy={isLoading}
        className="rounded-full border border-accent/50 bg-accent/10 px-8 py-3 text-sm font-medium text-zinc-100 transition-colors hover:border-accent hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Loading…" : "Load more"}
      </button>

      {/* The results already on screen are left alone, so a failure here is a
          hiccup rather than a reset — say so, and keep the button as retry. */}
      {error && (
        <p role="alert" className="max-w-md text-center text-sm text-red-400">
          {error}. The results above are still here — try again in a moment.
        </p>
      )}
    </div>
  );
}
