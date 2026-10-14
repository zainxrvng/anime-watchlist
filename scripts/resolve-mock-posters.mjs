// Resolves the real MyAnimeList poster URL for each title in
// mock-anilist.mjs's catalog, so the mock never shows artwork that belongs
// to a different anime.
//
// The live AniList API can't be relied on for this from here, but
// myanimelist.net is reachable, and every anime page carries an authoritative
// og:image poster. So: search
// MAL for the title, take the canonical page whose slug matches, read its
// og:image. Run it and paste the printed URLs into the mock's ENTRIES list.
//
//   node scripts/resolve-mock-posters.mjs
//
// Dev-only tooling — never imported by the app.
import { writeFileSync } from "node:fs";

const TITLES = [
  "Fullmetal Alchemist: Brotherhood",
  "Steins;Gate",
  "Cowboy Bebop",
  "Attack on Titan",
  "Death Note",
  "One Punch Man",
  "Demon Slayer: Kimetsu no Yaiba",
  "Jujutsu Kaisen",
  "Chainsaw Man",
  "Spy x Family",
  "My Hero Academia",
  "Hunter x Hunter",
  "Vinland Saga",
  "Mob Psycho 100",
  "Naruto",
  "Bleach",
  "Code Geass: Lelouch of the Rebellion",
  "Clannad: After Story",
  "Monster",
  "Haikyu!!",
  "Psycho-Pass",
  "Your Lie in April",
  "March Comes in Like a Lion",
  "The Promised Neverland",
  "Assassination Classroom",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * Titles whose English name is a translation. MAL's canonical slug is the
 * romanised Japanese title, and searching the English name surfaces movies and
 * sequels that carry it too — so search the native title instead.
 */
const SEARCH_TERMS = {
  "Demon Slayer: Kimetsu no Yaiba": "Kimetsu no Yaiba",
};

/** MAL slugs use underscores and doubles for punctuation. */
const slugToTitle = (slug) => slug.replace(/__/g, ": ").replace(/_/g, " ");

/** Collapses case, punctuation and spacing so titles can be compared. */
const normalise = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`retryable ${response.status}`);
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      if (attempt === 4) throw error;
      // MAL throttles aggressively; back off rather than hammer it.
      await sleep(1000 * attempt);
    }
  }
  throw new Error("unreachable");
}

/** Search results as { id, title, url } entries, skipping trailer pages. */
function parseResults(html) {
  const found = new Map();
  const pattern = /href="(https:\/\/myanimelist\.net\/anime\/(\d+)\/([^"#]+))"/g;
  for (const match of html.matchAll(pattern)) {
    const [, url, id, slug] = match;
    if (/\/video/.test(slug)) continue;
    const title = slugToTitle(decodeURIComponent(slug));
    if (!found.has(id)) found.set(id, { id: Number(id), title, url });
  }
  return [...found.values()];
}

function extractPoster(html) {
  // og:image is the page's own poster, so whatever id we resolved, the image
  // belongs to it by construction.
  const tag = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i);
  const fromTag = tag?.[0].match(/content=["']([^"']+)["']/i)?.[1];
  if (fromTag) return fromTag;

  // Attribute order varies between templates.
  const reversed = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i);
  return reversed?.[1] ?? null;
}

const rows = [];

for (const title of TITLES) {
  try {
    const searchHtml = await get(
      `https://myanimelist.net/anime.php?q=${encodeURIComponent(
        SEARCH_TERMS[title] ?? title,
      )}&cat=anime`,
    );
    const results = parseResults(searchHtml);

    // Prefer an exact slug match; fall back to the top hit and flag it so the
    // output can be checked by eye.
    const wanted = normalise(title);
    const exact = results.find((entry) => normalise(entry.title) === wanted);
    const chosen = exact ?? results[0];

    if (!chosen) {
      rows.push({ title, error: "no search results" });
      console.error(`  ?? ${title} — no results`);
      await sleep(400);
      continue;
    }

    await sleep(400);
    const pageHtml = await get(chosen.url);
    const poster = extractPoster(pageHtml);

    rows.push({
      title,
      id: chosen.id,
      matched: chosen.title,
      exact: Boolean(exact),
      poster,
    });
    console.log(
      `${exact ? "ok " : "?? "} ${String(chosen.id).padStart(6)}  ${title}` +
        `${exact ? "" : `  (top hit: ${chosen.title})`}`,
    );
    if (!poster) console.error(`     no og:image on ${chosen.url}`);
  } catch (error) {
    rows.push({ title, error: error.message });
    console.error(`ERR ${title}: ${error.message}`);
  }
  await sleep(400);
}

console.log("\n--- JSON ---");
console.log(JSON.stringify(rows, null, 2));

const bad = rows.filter((row) => row.error || !row.poster || !row.exact);
console.log(`\n${rows.length} resolved, ${bad.length} need eyeballing`);

// Optional: node scripts/resolve-mock-posters.mjs ./out.json
if (process.argv[2]) {
  writeFileSync(process.argv[2], `${JSON.stringify(rows, null, 2)}\n`);
  console.log(`wrote ${process.argv[2]}`);
}
