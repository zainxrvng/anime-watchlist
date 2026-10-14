// Local stand-in for api.jikan.moe, used only to verify lib/jikan.ts.
// Records every request so the test can assert rate limiting and retries.
//
//   node scripts/mock-jikan-api.mjs
//   npx tsx scripts/verify-jikan.ts
import { createServer } from "node:http";

const RAW_ANIME = [
  {
    mal_id: 21,
    title: "One Piece",
    images: {
      jpg: { image_url: "https://cdn.example/21.jpg" },
      webp: { image_url: "https://cdn.example/21.webp" },
    },
    score: 8.72,
    episodes: 1100,
    synopsis: "A pirate searches for the One Piece.",
    genres: [
      { mal_id: 1, name: "Action", type: "anime" },
      { mal_id: 10, name: "Fantasy", type: "anime" },
    ],
    status: "Currently Airing",
    year: 1999,
  },
  {
    // Sparse record: every optional field missing or null, to exercise defaults.
    mal_id: 999999,
    title: null,
    images: null,
    score: null,
    episodes: null,
    synopsis: null,
    genres: null,
    status: null,
    year: null,
  },
];

const requests = [];
let searchHits = 0;

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;
  requests.push({ path: pathname + url.search, at: Date.now() });

  const send = (status, body, headers = {}) => {
    res.writeHead(status, { "content-type": "application/json", ...headers });
    res.end(JSON.stringify(body));
  };

  if (pathname === "/__log") {
    send(200, { requests });
    return;
  }

  // /v4/anime?q=... -> search
  if (pathname === "/v4/anime" && url.searchParams.has("q")) {
    searchHits += 1;
    if (searchHits === 1) {
      // Simulate Jikan's rate limiter answering the very first search.
      send(429, { error: "Too Many Requests" }, { "retry-after": "1" });
      return;
    }
    send(200, {
      data: RAW_ANIME,
      pagination: {
        last_visible_page: 3,
        has_next_page: true,
        current_page: Number(url.searchParams.get("page") ?? "1"),
        items: { count: 2, total: 50, per_page: 25 },
      },
    });
    return;
  }

  if (pathname === "/v4/anime/1") {
    // Same fixture as the list results, but with mal_id matching the path.
    send(200, {
      data: {
        ...RAW_ANIME[0],
        mal_id: 1,
        images: {
          jpg: { image_url: "https://cdn.example/1.jpg" },
          webp: { image_url: "https://cdn.example/1.webp" },
        },
      },
    });
    return;
  }

  if (pathname === "/v4/anime/404") {
    send(404, { error: "Not Found" });
    return;
  }

  if (pathname === "/v4/anime/999") {
    // 200 with an empty payload: must be rejected by the not-found guard.
    send(200, { data: null });
    return;
  }

  if (pathname === "/v4/top/anime") {
    send(200, {
      data: RAW_ANIME,
      pagination: {
        last_visible_page: 2,
        has_next_page: true,
        current_page: Number(url.searchParams.get("page") ?? "1"),
      },
    });
    return;
  }

  send(404, { error: `Unknown endpoint ${pathname}` });
});

server.listen(4399, "127.0.0.1", () => {
  process.stdout.write("mock jikan listening on 127.0.0.1:4399\n");
});
