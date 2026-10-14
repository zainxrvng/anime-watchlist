import type { Metadata } from "next";

import { WatchlistView } from "@/components/WatchlistView";
import { isWatchlistStatus, type WatchlistStatus } from "@/types/watchlist";

export const metadata: Metadata = {
  title: "My Watchlist",
  description: "Titles you are watching, planning to watch, or have finished.",
};

// `searchParams` is request-time data, which Cache Components would otherwise
// try to hold back during prerendering and report as
// "Next.js encountered runtime data during prerendering". Opting the segment
// out (`instant = false`) skips the static-shell check for this route and lets
// it render per request — which is what we want for a query-selected tab.
// See node_modules/next/dist/docs/.../route-segment-config/instant.md.
export const instant = false;

interface WatchlistPageProps {
  /** The sidebar links here as `/watchlist?list=completed`; App Router hands
   *  searchParams over as a promise. */
  searchParams: Promise<{ list?: string }>;
}

export default async function WatchlistPage({ searchParams }: WatchlistPageProps) {
  const { list } = await searchParams;
  // Anything that isn't one of the three lists opens the default tab instead.
  const initialStatus: WatchlistStatus = isWatchlistStatus(list) ? list : "watching";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
        My Watchlist
      </h1>
      <WatchlistView initialStatus={initialStatus} />
    </main>
  );
}
