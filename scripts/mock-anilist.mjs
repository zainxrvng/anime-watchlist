// Local stand-in for AniList's GraphQL API. Serves realistic top/search
// payloads using real MyAnimeList poster URLs, each paired with the anime it
// belongs to so the artwork on screen matches the title above it.
// Records every operation so tests can assert on debounce and retry behaviour.
//
// To demo the UI against it:
//   node scripts/mock-anilist.mjs
//   ANILIST_BASE_URL=http://127.0.0.1:4399/graphql npm run dev
import { createServer } from "node:http";

/**
 * Every title with the poster that actually belongs to it.
 *
 * These used to live in two parallel arrays indexed by position, and the poster
 * was taken with `index % POSTERS.length` — so after the lists grew to
 * different lengths the artwork stopped lining up with the names. Keeping each
 * title and its poster in one tuple makes that class of bug impossible.
 *
 * Regenerate with: node scripts/resolve-mock-posters.mjs
 */
const ENTRIES = [
  ["Fullmetal Alchemist: Brotherhood", "https://cdn.myanimelist.net/images/anime/1208/94745.jpg"],
  ["Steins;Gate", "https://cdn.myanimelist.net/images/anime/1935/127974.jpg"],
  ["Cowboy Bebop", "https://cdn.myanimelist.net/images/anime/4/19644.jpg"],
  ["Attack on Titan", "https://cdn.myanimelist.net/images/anime/10/47347.jpg"],
  ["Death Note", "https://cdn.myanimelist.net/images/anime/1079/138100.jpg"],
  ["One Punch Man", "https://cdn.myanimelist.net/images/anime/12/76049.jpg"],
  ["Demon Slayer: Kimetsu no Yaiba", "https://cdn.myanimelist.net/images/anime/1286/99889.jpg"],
  ["Jujutsu Kaisen", "https://cdn.myanimelist.net/images/anime/1171/109222.jpg"],
  ["Chainsaw Man", "https://cdn.myanimelist.net/images/anime/1806/126216.jpg"],
  ["Spy x Family", "https://cdn.myanimelist.net/images/anime/1441/122795.jpg"],
  ["My Hero Academia", "https://cdn.myanimelist.net/images/anime/10/78745.jpg"],
  ["Hunter x Hunter", "https://cdn.myanimelist.net/images/anime/1305/132237.jpg"],
  ["Vinland Saga", "https://cdn.myanimelist.net/images/anime/1500/103005.jpg"],
  ["Mob Psycho 100", "https://cdn.myanimelist.net/images/anime/8/80356.jpg"],
  ["Naruto", "https://cdn.myanimelist.net/images/anime/1141/142503.jpg"],
  ["Bleach", "https://cdn.myanimelist.net/images/anime/1541/147774.jpg"],
  ["Code Geass: Lelouch of the Rebellion", "https://cdn.myanimelist.net/images/anime/1032/135088.jpg"],
  ["Clannad: After Story", "https://cdn.myanimelist.net/images/anime/1299/110774.jpg"],
  ["Monster", "https://cdn.myanimelist.net/images/anime/10/18793.jpg"],
  ["Haikyu!!", "https://cdn.myanimelist.net/images/anime/7/76014.jpg"],
  ["Psycho-Pass", "https://cdn.myanimelist.net/images/anime/1314/142015.jpg"],
  ["Your Lie in April", "https://cdn.myanimelist.net/images/anime/1405/143284.jpg"],
  ["March Comes in Like a Lion", "https://cdn.myanimelist.net/images/anime/1590/154000.jpg"],
  ["The Promised Neverland", "https://cdn.myanimelist.net/images/anime/1830/118780.jpg"],
  ["Assassination Classroom", "https://cdn.myanimelist.net/images/anime/5/75639.jpg"],
];

const GENRE_POOL = ["Action", "Adventure", "Drama", "Fantasy", "Mystery", "Sci-Fi"];

const LONG_SYNOPSIS = `What begins as an ordinary day quietly unravels when a power long thought lost resurfaces. Drawn together by circumstance, the group must decide how much of the story they have been told is actually true — and whether walking away is still an option. A tale of loyalty, ambition, and the choices that end up defining us.`;

// Every anime the mock knows about, shaped the way AniList really sends them.
const CATALOG = ENTRIES.map(([title, poster], index) => ({
  id: index + 1,
  title: { romaji: title, english: title, native: title },
  coverImage: { large: poster, extraLarge: poster },
  // AniList scores out of 100; a few titles have no rating yet.
  averageScore: index % 4 === 3 ? null : Number(((10 - index * 0.23) * 10).toFixed(1)),
  // A couple of ongoing titles have no announced episode count yet.
  episodes: index % 5 === 4 ? null : 26 + index * 12,
  description: `${title} — ${LONG_SYNOPSIS}`,
  // 2-4 genres, rotated so cards and chips don't all look identical.
  genres: Array.from({ length: 2 + (index % 3) }, (_, offset) => {
    return GENRE_POOL[(index + offset) % GENRE_POOL.length];
  }),
  status: index % 3 === 0 ? "RELEASING" : "FINISHED",
  seasonYear: 1998 + index,
  startDate: { year: 1998 + index },
}));

/** Every optional field null, to exercise the mapping defaults. */
const SPARSE = {
  id: 999999,
  title: { romaji: null, english: null, native: null },
  coverImage: null,
  averageScore: null,
  episodes: null,
  description: null,
  genres: null,
  status: null,
  seasonYear: null,
  startDate: null,
};

const RESPONSE_DELAY_MS = 450;
// Real AniList serves 25 a page; 15 keeps page 1 at the size the card-count
// assertions were written around, while still leaving a real page 2.
const PAGE_SIZE = 15;

const requests = [];
let rateLimitHits = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Slice the same way AniList's Page does, so "Load more" has a page 2. */
const paginate = (media, page) => ({
  data: {
    Page: {
      pageInfo: {
        currentPage: page,
        lastPage: Math.max(1, Math.ceil(media.length / PAGE_SIZE)),
        hasNextPage: page * PAGE_SIZE < media.length,
      },
      media: media.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    },
  },
});

const page = (media) => ({
  data: { Page: { pageInfo: { currentPage: 1, lastPage: 1, hasNextPage: false }, media } },
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  requests.push({ path: url.pathname, at: Date.now() });

  const send = (status, body, headers = {}) => {
    res.writeHead(status, { "content-type": "application/json", ...headers });
    res.end(JSON.stringify(body));
  };

  if (url.pathname === "/__log") {
    send(200, { requests });
    return;
  }

  // Lets a verification run start from a known state rather than inheriting
  // the 429 counter and request log from whichever run came before it.
  if (url.pathname === "/__reset") {
    requests.length = 0;
    rateLimitHits = 0;
    send(200, { ok: true });
    return;
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
  }

  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    send(400, { errors: [{ message: "Invalid JSON body" }] });
    return;
  }

  const query = String(body.query ?? "");
  const variables = body.variables ?? {};
  const operation = query.includes("TopAnime")
    ? "TopAnime"
    : query.includes("SearchAnime")
      ? "SearchAnime"
      : query.includes("AnimeById")
        ? "AnimeById"
        : "Unknown";

  // GraphQL puts every operation on one endpoint, so path alone tells tests
  // nothing — record the operation and its variables instead.
  requests[requests.length - 1] = {
    path: url.pathname,
    operation,
    at: Date.now(),
    search: variables.search ?? null,
    page: variables.page ?? null,
    id: variables.id ?? null,
  };

  await sleep(RESPONSE_DELAY_MS);

  if (operation === "TopAnime") {
    send(200, paginate(CATALOG, Number(variables.page ?? 1)));
    return;
  }

  if (operation === "SearchAnime") {
    const term = String(variables.search ?? "").toLowerCase();

    // "boom" always fails so the UI's error state can be exercised.
    if (term === "boom") {
      send(500, { errors: [{ message: "Mock AniList exploded" }] });
      return;
    }

    // "rate" answers 429 once, so the retry path can be exercised deliberately
    // rather than making every other test pay for a needless extra round trip.
    if (term === "rate") {
      rateLimitHits += 1;
      if (rateLimitHits === 1) {
        send(429, { errors: [{ message: "Too Many Requests" }] }, { "retry-after": "1" });
        return;
      }
    }

    // "sparse" returns a record with every optional field null.
    if (term === "sparse") {
      send(200, page([SPARSE]));
      return;
    }

    const matches = CATALOG.filter((anime) => anime.title.romaji.toLowerCase().includes(term));
    send(200, paginate(matches, Number(variables.page ?? 1)));
    return;
  }

  if (operation === "AnimeById") {
    const requestedId = Number(variables.id);

    // 500 is reserved so the transient-failure path can be exercised.
    if (requestedId === 500) {
      send(500, { errors: [{ message: "Mock upstream failure" }] });
      return;
    }

    // AniList answers an unknown id with a null Media rather than an HTTP 404.
    const found = CATALOG.find((anime) => anime.id === requestedId) ?? null;
    send(200, { data: { Media: found } });
    return;
  }

  send(400, { errors: [{ message: `Unknown operation: ${query.slice(0, 60)}` }] });
});

server.listen(4399, "127.0.0.1", () => {
  process.stdout.write("mock anilist listening on 127.0.0.1:4399\n");
});
