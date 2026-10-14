# AGENTS.md

Project rules for working in this repository. Follow them for every task.

## Project

`anime-watchlist` — a Next.js app (App Router, TypeScript, Tailwind CSS) for tracking anime.

## Rules

- **API**: Use the [Jikan API v4](https://api.jikan.moe/v4). It is free and requires no API key.
- **Components**: Keep components small, one per file, in `/components`.
- **API calls**: Put API calls in `/lib/jikan.ts`. Never call the API from inside a component.
- **Types**: Put shared types in `/types`.
- **Naming & comments**: Use clear variable names and add short comments explaining non-obvious logic.
- **Theme**: The app is dark-first — `<html>` carries the `dark` class and
  `@custom-variant dark` in `globals.css` points the `dark:` variant at it, so
  the palette never depends on the OS setting. Use **one accent colour**
  (`--accent`, violet `#8b5cf6`) for every interactive element. Red stays
  reserved for errors and destructive actions, amber for scores and the
  "plan to watch" state — don't introduce a fourth decorative colour.
- **Reporting**: After each task, briefly explain what you created and why.

## Structure

```
app/         App Router pages and layouts
app/api/     Route handlers — the only code allowed to call Jikan over HTTP
components/  Small, single-purpose React components (one per file)
lib/         API access and shared hooks
types/       Shared TypeScript types
public/      Static assets
```

Imports use the `@/*` alias configured in `tsconfig.json`, so `lib/jikan.ts`
is imported as `@/lib/jikan`.

Components never call Jikan directly. Browser code requests our own
`/api/anime` route handler, which calls `lib/jikan.ts` — that keeps CORS,
rate limiting and retries on the server.

## Verification

`scripts/` holds dev-only tooling — it is never imported by the app:

- `node scripts/mock-jikan-home.mjs` then
  `JIKAN_BASE_URL=http://127.0.0.1:4399/v4 npm run dev`
  runs the UI against a local Jikan stand-in. Use this while
  `api.jikan.moe` is unreachable from this machine.
- `node scripts/mock-jikan-api.mjs` then `npx tsx scripts/verify-jikan.ts`
  checks rate limiting, 429 retries and response mapping in `lib/jikan.ts`.
- `node scripts/resolve-mock-posters.mjs [out.json]` regenerates the mock's
  title→poster pairs. It can't use Jikan (blocked here), so it searches
  `myanimelist.net`, which is reachable, and reads each canonical page's
  `og:image`. Keep the mock's `ENTRIES` as title/poster **tuples** — two
  parallel arrays indexed by position is what originally let the artwork drift
  away from the names. Verify pairings by eye, or with the UI suites.

## Status

- Project setup, rules, and folder structure are in place.
- The API layer is built: `lib/jikan.ts` exposes `searchAnime()`,
  `getAnimeById()`, and `getTopAnime()`; shared types live in `types/`.
- The home page is built: a 400ms-debounced title search that shows top-ranked
  anime by default, with loading skeletons, an empty state and an error state
  with retry. Cards render poster, title, score and episode count in a
  2-to-5 column responsive grid.
- The anime detail page is built: `/anime/[id]` renders poster, title, score,
  synopsis, genres, status and year, with a back button and a mobile-first
  layout. A missing or malformed id yields a real HTTP 404 rendered by
  `app/not-found.tsx`. The route is intentionally blocking
  (`export const instant = false`) so that 404 status is real rather than a
  streamed 200, and `await connection()` stops prefetches from spending
  Jikan's rate limit.
- Watchlist persistence is built: `lib/useWatchlist.ts` holds titles in three
  lists (watching, planToWatch, completed) backed by localStorage through
  `useSyncExternalStore`. That store lives outside React, so the server
  renders an empty snapshot and the client hydrates against it before swapping
  in the real data — no hydration mismatch, and a second tab stays in step.
  It exposes addToList, moveToList, removeFromList and getStatus.
- The status dropdown (`components/WatchlistControl.tsx`) is the only place a
  title's list is changed; it appears on every home card, the detail page and
  the watchlist page. `/watchlist` lists the three tabs with count badges and
  lets you move or remove items.
- The app is polished: dark-first theme with a single violet accent, cards
  that lift and zoom on hover (via Tailwind v4's `translate`/`scale`
  properties, not `transform`), a "Load more" button that appends paginated
  results with de-duplication, and toasts for add/move/remove raised by
  `lib/toast.ts` — a module-level store outside React, mirroring the watchlist
  store, so `toast()` needs no provider. Accessibility pass: the dropdown and
  the watchlist tabs are fully arrow-key driven (roving tabindex, focus
  returned to the trigger on Escape), every image has alt text, and animation
  honours `prefers-reduced-motion`.
- Mock data is correct: every title in `scripts/mock-jikan-home.mjs` carries
  the MyAnimeList poster that actually belongs to it. The mismatch came from
  pairing titles and posters through two parallel arrays with
  `index % POSTERS.length`; they are now one list of tuples, and all 25 pairs
  have been checked against MAL visually and by automated test.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
