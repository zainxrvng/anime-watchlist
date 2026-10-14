"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { AppSidebar } from "./AppSidebar";

interface AppShellProps {
  /** Server-rendered page content. Passing it through as a prop keeps each
   *  page a Server Component — only this wrapper is client-side. */
  children: ReactNode;
}

/**
 * Page chrome shared by every route: a persistent sidebar, plus a slim header
 * that replaces it below `lg` so the 2-column phone grid keeps the full width.
 */
export function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Escape dismisses the drawer, so keyboard users can't get trapped in it.
  useEffect(() => {
    if (!drawerOpen) {
      return;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="flex w-full flex-1 flex-col">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen((open) => !open)}
          aria-expanded={drawerOpen}
          aria-controls="app-sidebar"
          aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"}
          className="-ml-1 rounded-md p-2 text-zinc-300 transition-colors hover:bg-white/10 hover:text-zinc-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ☰
          </span>
        </button>
        <Link
          href="/"
          onClick={() => setDrawerOpen(false)}
          className="text-sm font-semibold tracking-tight text-zinc-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          Anime Watchlist
        </Link>
      </header>

      {drawerOpen && (
        // Scrim only — Escape, the toggle and navigating all dismiss too.
        <div
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <div className="flex flex-1">
        <AppSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        {/* pl-64 clears the fixed sidebar from lg up. */}
        <div className="min-w-0 flex-1 lg:pl-64">{children}</div>
      </div>
    </div>
  );
}
