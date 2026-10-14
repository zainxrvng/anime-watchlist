// Verification script for lib/jikan.ts.
// The real api.jikan.moe is unreachable from this machine, so the functions
// are pointed at a local mock that reproduces Jikan's response shapes,
// including a 429 on the first search and a 404 for an unknown id.
//
// Run in two terminals:
//   node scripts/mock-jikan-api.mjs
//   npx tsx scripts/verify-jikan.ts

process.env.JIKAN_BASE_URL = "http://127.0.0.1:4399/v4";

interface LoggedRequest {
  path: string;
  at: number;
}

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}`, detail === undefined ? "" : JSON.stringify(detail));
  }
}

async function requestLog(): Promise<LoggedRequest[]> {
  const response = await fetch("http://127.0.0.1:4399/__log");
  const body = (await response.json()) as { requests: LoggedRequest[] };
  // Ignore the log fetches themselves when measuring behaviour.
  return body.requests.filter((entry) => entry.path !== "/__log");
}

async function main(): Promise<void> {
  const { searchAnime, getAnimeById, getTopAnime, JikanApiError } = await import("../lib/jikan");

  console.log("\nsearchAnime (first request answered with 429, then retried)");
  const search = await searchAnime("naruto", 2);
  check("returns an anime array", Array.isArray(search.anime) && search.anime.length === 2, search);
  check("id is a number", typeof search.anime[0].id === "number", search.anime[0]);
  check(
    "genres flattened to names",
    JSON.stringify(search.anime[0].genres) === '["Action","Fantasy"]',
    search.anime[0].genres,
  );
  check(
    "pagination mapped to camelCase",
    search.pagination.currentPage === 2 &&
      search.pagination.lastVisiblePage === 3 &&
      search.pagination.hasNextPage === true,
    search.pagination,
  );
  check("raw mal_id not leaked", !("mal_id" in search.anime[0]), search.anime[0]);

  console.log("\nsearchAnime - sparse record fills in defaults");
  const sparse = search.anime[1];
  check("score is null", sparse.score === null, sparse);
  check("episodes is null", sparse.episodes === null, sparse);
  check("synopsis is empty string", sparse.synopsis === "", sparse);
  check("genres is empty array", Array.isArray(sparse.genres) && sparse.genres.length === 0, sparse);
  check("status falls back to Unknown", sparse.status === "Unknown", sparse);
  check("year is null", sparse.year === null, sparse);
  check("title falls back to Untitled", sparse.title === "Untitled", sparse);
  check("image falls back to empty string", sparse.image === "", sparse);

  console.log("\ngetAnimeById(1)");
  const one = await getAnimeById(1);
  check(
    "returns a clean anime",
    one.id === 1 && one.title === "One Piece" && one.image === "https://cdn.example/1.jpg",
    one,
  );
  check("uses jpg over webp", one.image.endsWith("1.jpg"), one.image);

  console.log("\ngetAnimeById(404) - must fail fast, no retry");
  const before404 = await requestLog();
  let status404: number | undefined;
  try {
    await getAnimeById(404);
    check("should have thrown", false);
  } catch (error) {
    check("throws JikanApiError", error instanceof JikanApiError, error);
    status404 = error instanceof JikanApiError ? error.status : undefined;
  }
  check("status is 404", status404 === 404, status404);
  const after404 = await requestLog();
  const hits404 =
    after404.filter((entry) => entry.path.startsWith("/v4/anime/404")).length -
    before404.filter((entry) => entry.path.startsWith("/v4/anime/404")).length;
  check("404 issued exactly one request (not retried)", hits404 === 1, hits404);

  console.log("\ngetAnimeById(999) - 200 with empty data");
  let emptyRejected = false;
  try {
    await getAnimeById(999);
  } catch (error) {
    emptyRejected = error instanceof JikanApiError;
  }
  check("empty payload rejected", emptyRejected);

  console.log("\ngetTopAnime()");
  const top = await getTopAnime();
  check(
    "returns list plus pagination",
    Array.isArray(top.anime) && top.anime.length === 2 && top.pagination.hasNextPage === true,
    top.pagination,
  );

  console.log("\nretry behaviour");
  const log = await requestLog();
  const searchRequests = log.filter((entry) => entry.path.startsWith("/v4/anime?q="));
  check("search requested twice (429 then success)", searchRequests.length === 2, searchRequests);

  console.log("\nrate limiting");
  const gaps: number[] = [];
  for (let index = 1; index < log.length; index += 1) {
    gaps.push(log[index].at - log[index - 1].at);
  }
  const minGap = Math.min(...gaps);
  check(`min gap between requests >= 250ms (was ${minGap}ms)`, minGap >= 250, gaps);

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error("VERIFY CRASHED:", error);
  process.exitCode = 1;
});
