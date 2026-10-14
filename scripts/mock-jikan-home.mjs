// Mock Jikan for home-page testing. Serves realistic top/search payloads
// using real MyAnimeList poster URLs, each paired with the anime it belongs to
// so the artwork on screen matches the title above it.
// Logs every request so tests can assert on debounce behaviour.
//
// To demo the UI against it:
//   node scripts/mock-jikan-home.mjs
//   JIKAN_BASE_URL=http://127.0.0.1:4399/v4 npm run dev
import { createServer } from "node:http";

/**
 * Every title with the MyAnimeList poster that actually belongs to it.
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

const GENRE_POOL = [
  { mal_id: 1, name: "Action", type: "anime" },
  { mal_id: 2, name: "Adventure", type: "anime" },
  { mal_id: 8, name: "Drama", type: "anime" },
  { mal_id: 10, name: "Fantasy", type: "anime" },
  { mal_id: 7, name: "Mystery", type: "anime" },
  { mal_id: 24, name: "Sci-Fi", type: "anime" },
];

const LONG_SYNOPSIS = `What begins as an ordinary day quietly unravels when a power long thought lost resurfaces. Drawn together by circumstance, the group must decide how much of the story they have been told is actually true — and whether walking away is still an option. A tale of loyalty, ambition, and the choices that end up defining us.`;

// Every anime the mock knows about, shaped the way Jikan actually sends them.
const CATALOG = ENTRIES.map(([title, poster], index) => ({
  mal_id: index + 1,
  title,
  images: { jpg: { image_url: poster } },
  score: index % 4 === 3 ? null : Number((10 - index * 0.23).toFixed(2)),
  // A couple of ongoing titles have no announced episode count yet.
  episodes: index % 5 === 4 ? null : 26 + index * 12,
  synopsis: `${title} — ${LONG_SYNOPSIS}`,
  // 2-4 genres, rotated so cards and chips don't all look identical.
  genres: Array.from({ length: 2 + (index % 3) }, (_, offset) => {
    return GENRE_POOL[(index + offset) % GENRE_POOL.length];
  }),
  status: index % 3 === 0 ? "Currently Airing" : "Finished Airing",
  year: 1998 + index,
}));

const RESPONSE_DELAY_MS = 450;
// 25 titles over a 15-item page size means page 1 is unchanged for the tests
// that count cards on it, but there is a real page 2 for "Load more" to fetch.
const PAGE_SIZE = 15;
const requests = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;
  requests.push({ path: pathname + url.search, at: Date.now() });

  const send = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (pathname === "/__log") {
    send(200, { requests });
    return;
  }

  await sleep(RESPONSE_DELAY_MS);

  // Slices the way Jikan really does, so "Load more" has a page 2 to fetch.
  const paginate = (items, page) => ({
    data: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    pagination: {
      last_visible_page: Math.max(1, Math.ceil(items.length / PAGE_SIZE)),
      has_next_page: page * PAGE_SIZE < items.length,
      current_page: page,
      items: { count: items.length, total: items.length, per_page: PAGE_SIZE },
    },
  });

  // /v4/top/anime -> the default home page listing.
  if (pathname === "/v4/top/anime") {
    send(200, paginate(CATALOG, Number(url.searchParams.get("page") ?? "1")));
    return;
  }

  // /v4/anime?q=... -> title search.
  if (pathname === "/v4/anime" && url.searchParams.has("q")) {
    const query = url.searchParams.get("q").toLowerCase();

    // "boom" always fails so the UI's error state can be exercised.
    if (query === "boom") {
      send(500, { error: "Mock Jikan exploded" });
      return;
    }

    const matches = CATALOG.filter((anime) => anime.title.toLowerCase().includes(query));
    send(200, paginate(matches, Number(url.searchParams.get("page") ?? "1")));
    return;
  }

  // /v4/anime/{id} -> a single title.
  const singleAnime = pathname.match(/^\/v4\/anime\/(\d+)$/);
  if (singleAnime) {
    const requestedId = Number(singleAnime[1]);

    // 500 is reserved so the transient-failure path can be exercised.
    if (requestedId === 500) {
      send(500, { error: "Mock upstream failure" });
      return;
    }

    const found = CATALOG.find((entry) => entry.mal_id === requestedId);
    if (!found) {
      send(404, { error: "Not Found" });
      return;
    }

    send(200, { data: found });
    return;
  }

  send(404, { error: `Unknown endpoint ${pathname}` });
});

server.listen(4399, "127.0.0.1", () => {
  process.stdout.write("home-page mock jikan listening on 127.0.0.1:4399\n");
});
