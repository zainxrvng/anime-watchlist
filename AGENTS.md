# AGENTS.md

Project rules for working in this repository. Follow them for every task.

## Project

`anime-watchlist` — a Next.js app (App Router, TypeScript, Tailwind CSS) for tracking anime.

## Rules

- **API**: Use the [AniList GraphQL API](https://graphql.anilist.co). It is free
  and requires no API key.
- **Components**: Keep components small, one per file, in `/components`.
- **API calls**: Put API calls in `/lib/anilist.ts`. Never call the API from inside a component.
- **Types**: Put shared types in `/types`.
- **Naming & comments**: Use clear variable names and add short comments explaining non-obvious logic.
- **One source of truth for ids**: every id in this app is an **AniList** id.
  MyAnimeList ids are unrelated numbers for the same shows, so never mix the
  two — a watchlist keyed by one cannot resolve entries saved under the other.
  That is why `lib/useWatchlist.ts` bumped `anime-watchlist:v1` → `:v2`.
- **Navigation**: Cards and watchlist rows link to `/anime/[id]` with a
  *stretched link* — the anchor sits on the title text and is stretched across
  the card with `after:absolute after:inset-0`. Never wrap the card in `<a>`:
  the status `<button>` would then be inside a link, which is invalid HTML.
  Anything interactive beneath a stretched link needs `relative z-10` to stay
  clickable.
- **Shell**: `components/AppShell.tsx` owns the page chrome — a persistent
  sidebar plus a drawer that replaces it below `lg`. Pages keep their own
  `<main>`; content passes through the shell as server-rendered children, so no
  page turns into a client component just because the shell is one.
- **Transitions**: never use `transition-all` on an element whose `z-index` is
  raised by a variant (see `AnimeCard`). `transition-all` animates `z-index`
  too, so `hover:z-10` takes 300ms to land — and for that whole window an open
  status menu still sits at `z=0` and loses the hit-test to a neighbouring
  card's link overlay. List the animated properties explicitly instead. Note
  that the tilt's `transform` makes the card a stacking context at rest, so
  from then on the card's *own* `z-index` is what settles that hit-test — which
  only stays safe because the raise is instant. Never add `z-index` to that
  transition list.
- **Motion**: the 3D card tilt comes from `lib/useTilt.ts`, which writes
  `--tilt-x`/`--tilt-y` onto the element instead of into React state — a
  pointermove would otherwise mean 60 renders a second for a presentational
  value. The consuming rule (`.card-tilt`) lives in `app/globals.css` and is
  deliberately unlayered so it outranks Tailwind's layered utilities; that is
  also why reduced motion is checked inside the hook rather than with a
  `motion-reduce:` utility, which would lose that cascade. Tilt uses
  `transform` because Tailwind v4 puts the hover lift in `translate` and the
  poster zoom in `scale`, so all three compose instead of colliding.
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
app/api/     Route handlers — the only code allowed to call AniList over HTTP
components/  Small, single-purpose React components (one per file)
lib/         API access and shared hooks
types/       Shared TypeScript types
public/      Static assets
```

Imports use the `@/*` alias configured in `tsconfig.json`, so `lib/anilist.ts`
is imported as `@/lib/anilist`.

Components never call AniList directly. Browser code requests our own
`/api/anime` route handler, which calls `lib/anilist.ts` — that keeps CORS,
rate limiting and retries on the server.

## Verification

`scripts/` holds dev-only tooling — it is never imported by the app:

- `node scripts/mock-anilist.mjs` then
  `ANILIST_BASE_URL=http://127.0.0.1:4399/graphql npm run dev`
  runs the UI against a local AniList stand-in. Use this whenever the real
  `graphql.anilist.co` is not what you want to test against — it is what all
  six UI suites run on, because they need deterministic data.
- `node scripts/mock-anilist.mjs` then `npx tsx scripts/verify-anilist.ts`
  checks rate limiting, 429 retries, 5xx retries, not-found handling and
  response mapping in `lib/anilist.ts`. One mock process serves this and the
  dev server together — they only conflict if you start a second copy, which
  would fail to bind port 4399.
- `node scripts/resolve-mock-posters.mjs [out.json]` regenerates the mock's
  title→poster pairs. It can't use the AniList covers (blocked or unverified
  here), so it searches `myanimelist.net`, which is reachable, and reads each
  canonical page's `og:image`. Keep the mock's `ENTRIES` as title/poster
  **tuples** — two parallel arrays indexed by position is what originally let
  the artwork drift away from the names. Verify pairings by eye, or with the
  UI suites.
- `npx tsx scripts/probe-real-api.ts` hits the **live** `graphql.anilist.co` —
  it deliberately leaves `ANILIST_BASE_URL` unset — to answer whether this
  machine can reach AniList at all, and to confirm that a blocked host fails in
  bounded time with an `AniListApiError` rather than hanging on the socket.
- The UI suites live outside the project in `%LOCALAPPDATA%\Temp\opencode\uitest\`
  and expect a dev server running against the mock. Seven suites, all required:
  `ui-test.js`, `detail-test.js`, `watchlist-test.js`, `polish-test.js`,
  `pairing-test.js`, `nav-test.js` — the last covers the sidebar, the
  card→detail navigation, and a guard that card links don't fire one AniList
  request per card — and `tilt-test.js`, which drives a real mouse across a
  card and asserts the rotation appears, settles back to flat, is suppressed
  under `prefers-reduced-motion`, and that hovering still raises `z-index` to
  10.

## Status

- Project setup, rules, and folder structure are in place.
- The API layer is built: `lib/anilist.ts` exposes `searchAnime()`,
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
  AniList's rate limit.
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
- Mock data is correct: every title in `scripts/mock-anilist.mjs` carries
  the MyAnimeList poster that actually belongs to it. The mismatch came from
  pairing titles and posters through two parallel arrays with
  `index % POSTERS.length`; they are now one list of tuples, and all 25 pairs
  have been checked against MAL visually and by automated test.
- Navigation and the global sidebar are built. Every card and watchlist row
  opens its detail page through a stretched link, and `AppShell` adds a
  persistent sidebar to every route — Home, My Watchlist and the three
  categories with live counts — collapsing to a toggleable drawer below `lg`
  so the 2-column phone grid keeps the full width. Category rows deep-link to
  `/watchlist?list=…`, so that page reads `searchParams` and renders on demand
  (`export const instant = false`, listed as `ƒ (Dynamic)` by `next build`).
- **The app now searches the whole catalogue.** It reads from AniList's
  GraphQL API (`lib/anilist.ts`, defaults to `https://graphql.anilist.co`;
  only `ANILIST_BASE_URL` points it at the mock), so any title in AniList's
  database is findable — the old 25-title ceiling came from testing against a
  local stand-in while `api.jikan.moe` was unreachable. AniList scores out of
  100 and sends HTML-ish descriptions; the layer scales scores to /10 and
  flattens markup before anything reaches a component. Rate budget is ~90
  requests/minute, held to 700ms between requests, with 3 attempts and a 5s
  `AbortSignal.timeout` per attempt so an unreachable host fails with a clear
  `AniListApiError` instead of hanging on the socket.
- The cards tilt in 3D under the cursor. `lib/useTilt.ts` writes `--tilt-x` /
  `--tilt-y` on pointermove and `.card-tilt` in `app/globals.css` turns them
  into `perspective(900px) rotateX(...) rotateY(...)`. It is pure CSS 3D — no
  WebGL, no new dependency, no per-card GPU context — and it stacks with the
  existing hover lift because Tailwind v4 keeps `translate`, `scale` and
  `transform` as three separate properties. Rotation is disabled inside the
  hook when `prefers-reduced-motion` is set. `AnimeCard` had to become a
  client component for this; the cards still server-render, since a client
  component with serializable props renders on the server too.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
