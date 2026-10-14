import type { Metadata } from "next";

import { WatchlistView } from "@/components/WatchlistView";

export const metadata: Metadata = {
  title: "My Watchlist",
  description: "Titles you are watching, planning to watch, or have finished.",
};

export default function WatchlistPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
        My Watchlist
      </h1>
      <WatchlistView />
    </main>
  );
}
