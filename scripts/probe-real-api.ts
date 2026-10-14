// Reachability probe for the live AniList API.
//
// lib/anilist.ts defaults to https://graphql.anilist.co unless ANILIST_BASE_URL
// is set, so running this with the variable unset answers two questions:
//   1. can this machine reach real AniList? (i.e. is the app on live data), and
//   2. if it can't, does lib/anilist.ts fail in bounded time rather than
//      hanging on the socket — with an AniListApiError the UI can render?
//
// Run: npx tsx scripts/probe-real-api.ts

// Keeps this a module, so `main` can't collide with another script's global.
export {};

async function probeLiveApi(): Promise<void> {
  const started = Date.now();
  console.log(
    "endpoint:",
    process.env.ANILIST_BASE_URL || "https://graphql.anilist.co (default, live API)",
  );

  const { searchAnime, AniListApiError } = await import("../lib/anilist");

  try {
    const result = await searchAnime("frieren", 1);
    const elapsed = Date.now() - started;
    console.log(`SUCCESS in ${elapsed}ms: ${result.anime.length} titles`);
    for (const anime of result.anime.slice(0, 3)) {
      console.log(`  - ${anime.title} [${anime.id}] score=${anime.score ?? "n/a"}`);
    }
    console.log("AniList is reachable — the app is on live data.");
  } catch (error) {
    const elapsed = Date.now() - started;
    console.log(`failed in ${elapsed}ms`);
    console.log(`is AniListApiError: ${error instanceof AniListApiError}`);
    console.log(`message: ${error instanceof Error ? error.message : String(error)}`);
    console.log(elapsed < 30_000 ? "  PASS  bounded (<30s)" : "  FAIL  took too long");
  }
}

void probeLiveApi();
