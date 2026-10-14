// Verification script for lib/anilist.ts.
// Points the functions at a local mock that reproduces AniList's GraphQL
// response shapes, including a 429 on the first "rate" search, a null Media
// for an unknown id, and a record with every optional field missing.
//
// Run in two terminals:
//   node scripts/mock-anilist.mjs
//   npx tsx scripts/verify-anilist.ts

// Set before the dynamic import, which is what reads it.
process.env.ANILIST_BASE_URL = "http://127.0.0.1:4399/graphql";

// Makes this a module, so `main` can't collide with another script's global.
export {};

interface LoggedRequest {
  path: string;
  operation: string;
  search?: string | null;
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
  return body.requests.filter((entry) => entry.path !== "/__log");
}

async function main(): Promise<void> {
  const { searchAnime, getAnimeById, getTopAnime, AniListApiError } = await import("../lib/anilist");

  // The mock outlives a single run, so reset it first — otherwise the 429
  // counter and the request log both carry over from the previous run and the
  // retry assertions stop being repeatable.
  await fetch("http://127.0.0.1:4399/__reset");

  // 1. Search maps AniList's shapes down to the app's.
  const search = await searchAnime("cowboy", 1);
  check("search finds Cowboy Bebop", search.anime.length === 1, search.anime);
  const cowboy = search.anime[0];
  check("title mapped", cowboy?.title === "Cowboy Bebop", cowboy?.title);
  check("id is a number", typeof cowboy?.id === "number", cowboy?.id);
  check("poster URL absolute", cowboy?.image.startsWith("https://"), cowboy?.image);
  // AniList scores out of 100; the app must show a score out of 10.
  check("score scaled to /10", (cowboy?.score ?? 0) <= 10, cowboy?.score);
  check("genres are plain strings", cowboy?.genres.every((g) => typeof g === "string"), cowboy?.genres);
  check("status is human-readable", (cowboy?.status ?? "").length > 3, cowboy?.status);

  // 2. Pagination.
  const top1 = await getTopAnime(1);
  check("top page 1 returns 15", top1.anime.length === 15, top1.anime.length);
  check("top page 1 has a next page", top1.pagination.hasNextPage, top1.pagination);
  check("top reports 2 pages", top1.pagination.lastVisiblePage === 2, top1.pagination);
  const top2 = await getTopAnime(2);
  check("top page 2 returns the remaining 10", top2.anime.length === 10, top2.anime.length);
  check("top page 2 has no next page", top2.pagination.hasNextPage === false, top2.pagination);

  // 3. Empty results are a success, not an error.
  const empty = await searchAnime("zzzq", 1);
  check("unknown term returns an empty list", empty.anime.length === 0, empty.anime);
  check("unknown term reports no next page", empty.pagination.hasNextPage === false, empty.pagination);

  // 4. A sparse record must not throw while mapping.
  const sparse = await searchAnime("sparse", 1);
  const bare = sparse.anime[0];
  check("sparse record maps", sparse.anime.length === 1, sparse.anime);
  check("missing title becomes empty string", bare?.title === "", bare?.title);
  check("missing image becomes empty string", bare?.image === "", bare?.image);
  check("missing score stays null", bare?.score === null, bare?.score);
  check("missing episodes stay null", bare?.episodes === null, bare?.episodes);
  check("missing synopsis stays empty", bare?.synopsis === "", bare?.synopsis);
  check("missing genres become an empty array", bare?.genres.length === 0, bare?.genres);
  check("missing year stays null", bare?.year === null, bare?.year);

  // 5. Single-id lookup.
  const one = await getAnimeById(1);
  check("id 1 is the first title", one.title === "Fullmetal Alchemist: Brotherhood", one.title);
  check("status enum mapped", one.status === "Currently Airing", one.status);
  check("year mapped", one.year === 1998, one.year);
  check("synopsis non-empty", one.synopsis.length > 20, one.synopsis.length);

  // 6. Not-found surfaces as a 404 the detail page turns into a real 404.
  for (const id of [404, 999]) {
    let status: number | undefined;
    let threw = false;
    try {
      await getAnimeById(id);
    } catch (error) {
      threw = true;
      check(`${id} throws AniListApiError`, error instanceof AniListApiError, error);
      status = error instanceof AniListApiError ? error.status : undefined;
    }
    check(`${id} did not resolve`, threw);
    check(`${id} carries status 404`, status === 404, status);
  }

  // 7. A 5xx exhausts its retries and surfaces as an error.
  const beforeBoom = await requestLog();
  let boomRejected = false;
  try {
    await searchAnime("boom", 1);
  } catch (error) {
    boomRejected = error instanceof AniListApiError;
  }
  const afterBoom = await requestLog();
  check("transient 5xx rejects", boomRejected);
  check("5xx was retried 3 times", afterBoom.length - beforeBoom.length === 3, afterBoom.length - beforeBoom.length);

  // 8. A 429 is retried, not surfaced.
  await searchAnime("rate", 1);
  const log = await requestLog();
  const rateCalls = log.filter((entry) => entry.operation === "SearchAnime" && entry.search === "rate");
  check("429 search retried", rateCalls.length === 2, rateCalls.length);

  // 9. Requests are spaced out to stay inside AniList's ~90/minute budget.
  const gaps = log.slice(1).map((entry, index) => entry.at - log[index].at);
  const minGap = gaps.length ? Math.min(...gaps) : 0;
  check(`requests spaced >=600ms apart (was ${minGap}ms)`, minGap >= 600, gaps);

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error("ANILIST VERIFY CRASHED:", error);
    process.exitCode = 1;
  })
  // The mock keeps the process alive; tests decide their own exit code.
  .finally(() => setTimeout(() => process.exit(process.exitCode ?? 0), 200));
