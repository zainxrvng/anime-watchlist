interface ErrorStateProps {
  /** Raw failure reason from the API, shown as a secondary detail line. */
  detail: string;
  onRetry: () => void;
}

/** Shown when a request fails for good, with a way to try again. */
export function ErrorState({ detail, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 py-16 text-center"
    >
      <span aria-hidden="true" className="text-4xl">
        🧭
      </span>
      <h2 className="text-lg font-semibold text-red-200">
        We couldn&apos;t load anime right now
      </h2>
      {/* Lead with reassurance; the technical reason is easy to miss if unwanted. */}
      <p className="max-w-md text-sm text-red-300/90">
        The anime service didn&apos;t respond. Check your connection and try again — it&apos;s
        usually just a hiccup.
      </p>
      {detail && (
        <p className="max-w-lg text-xs text-red-400/80 break-words">{detail}</p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/85 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        Try again
      </button>
    </div>
  );
}
