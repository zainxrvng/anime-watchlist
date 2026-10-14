"use client";

import { useState } from "react";

import { WatchlistEmptyState } from "@/components/WatchlistEmptyState";
import { WatchlistItem } from "@/components/WatchlistItem";
import { WatchlistTabs } from "@/components/WatchlistTabs";
import { useWatchlist } from "@/lib/useWatchlist";
import { WATCHLIST_LABELS, type WatchlistStatus } from "@/types/watchlist";

/** Tabbed view over the three saved lists. */
export function WatchlistView() {
  const { lists } = useWatchlist();
  const [active, setActive] = useState<WatchlistStatus>("watching");
  const savedAnime = lists[active];

  return (
    <div className="flex flex-col gap-6">
      <WatchlistTabs lists={lists} active={active} onSelect={setActive} />

      <div id="watchlist-panel" role="tabpanel" aria-labelledby={`watchlist-tab-${active}`}>
        {savedAnime.length === 0 ? (
          <WatchlistEmptyState label={WATCHLIST_LABELS[active]} />
        ) : (
          <ul className="flex flex-col gap-3">
            {savedAnime.map((anime) => (
              <WatchlistItem key={anime.id} anime={anime} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
