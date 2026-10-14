interface SearchBarProps {
  value: string;
  onChange: (nextValue: string) => void;
}

/** Controlled title-search input. State lives in the parent. */
export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative w-full">
      <label htmlFor="anime-search" className="sr-only">
        Search anime by title
      </label>
      <input
        id="anime-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search anime by title…"
        autoComplete="off"
        className="w-full rounded-full border border-zinc-700 bg-zinc-900/60 py-3 pr-4 pl-12 text-base text-zinc-100 transition-colors placeholder:text-zinc-500 hover:border-zinc-600 focus:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/40 focus:outline-none"
      />
      {/* Decorative only — the label above already names the field. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-500"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
        />
      </svg>
    </div>
  );
}
