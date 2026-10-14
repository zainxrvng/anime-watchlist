import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AnimeDetail } from "@/components/AnimeDetail";
import { LoadErrorState } from "@/components/LoadErrorState";
import { getAnimeById, JikanApiError } from "@/lib/jikan";
import type { Anime } from "@/types/anime";

interface AnimeDetailPageProps {
  params: Promise<{ id: string }>;
}

// This route is deliberately blocking: the anime lookup is live and
// rate-limited, and the server has to know the outcome before it responds so a
// missing title still returns a real HTTP 404 rather than a streamed 200.
export const instant = false;

export default async function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  // connection() stops prefetches from firing Jikan requests for pages the
  // user may never open, which protects the 3 requests/second budget.
  await connection();

  const { id } = await params;
  const animeId = Number(id);

  // Reject junk URLs before spending a request on them.
  if (!Number.isInteger(animeId) || animeId <= 0) {
    notFound();
  }

  let anime: Anime;
  try {
    anime = await getAnimeById(animeId);
  } catch (error) {
    // A title that doesn't exist is a real 404; a timeout or rate limit is
    // not, and calling notFound() for those would send users to a dead end.
    if (error instanceof JikanApiError && error.status === 404) {
      notFound();
    }

    const detail = error instanceof Error ? error.message : "Unknown error";
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
        <LoadErrorState detail={detail} />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
      <AnimeDetail anime={anime} />
    </main>
  );
}
