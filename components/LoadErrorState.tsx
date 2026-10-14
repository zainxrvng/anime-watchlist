import { BackButton } from "./BackButton";

interface LoadErrorStateProps {
  /** Technical reason, shown as a secondary detail line. */
  detail: string;
}

/**
 * Shown when the anime service failed but the title may well exist.
 * Deliberately server-renderable — no click handlers, so it works from a
 * Server Component without pulling client JS onto the page.
 */
export function LoadErrorState({ detail }: LoadErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-14 text-center"
    >
      <span aria-hidden="true" className="text-4xl">
        🌤️
      </span>
      <h1 className="text-xl font-semibold text-red-200">
        We couldn&apos;t load this anime
      </h1>
      <p className="max-w-md text-sm text-red-300/90">
        The anime service didn&apos;t respond. This is usually temporary — head back and try
        again in a moment.
      </p>
      {detail && <p className="max-w-lg text-xs break-words text-red-400/80">{detail}</p>}
      <BackButton label="Back to home" />
    </div>
  );
}
