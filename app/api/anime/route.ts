import { NextResponse, type NextRequest } from "next/server";

import { getTopAnime, searchAnime, AniListApiError } from "@/lib/anilist";
import type { ApiErrorResponse } from "@/types";

/**
 * AniList paginates every Page query. Missing or nonsense values fall back
 * to page 1 instead of erroring out.
 */
function parsePage(rawPage: string | null): number {
  const parsedPage = Number.parseInt(rawPage ?? "1", 10);
  return Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

/**
 * Serves anime data to the browser.
 *
 * Keeping this in a route handler means the client only ever talks to our own
 * origin, so there is no CORS dependency on AniList and every API call still
 * flows through lib/anilist.ts as the project rules require.
 *
 * Omitting `q` means "show the top-ranked anime", which is what the home page
 * asks for while the search box is empty.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim() ?? "";
  const page = parsePage(searchParams.get("page"));

  try {
    const result = query ? await searchAnime(query, page) : await getTopAnime(page);
    return NextResponse.json(result);
  } catch (error) {
    // 404 means a bad id; anything else means AniList itself failed or timed out.
    const status = error instanceof AniListApiError && error.status === 404 ? 404 : 502;
    const message = error instanceof AniListApiError ? error.message : "Unexpected error";

    return NextResponse.json<ApiErrorResponse>({ error: message }, { status });
  }
}
