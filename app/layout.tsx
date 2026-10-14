import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AmbientBackground } from "@/components/AmbientBackground";
import { AppShell } from "@/components/AppShell";
import { CursorLight } from "@/components/CursorLight";
import { ToastViewport } from "@/components/ToastViewport";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anime Watchlist",
  description: "Search anime and keep track of what you want to watch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Pinned dark: see the @custom-variant in globals.css. The app ships one
    // theme rather than following the OS, so the palette never half-matches.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Ambient layers first so they paint underneath: the violet wash and
            the 3D scene are z-index -1, the cursor light is z-45. All three are
            position: fixed, so they leave this flex layout alone. */}
        <AmbientBackground />

        {/* The shell is a client component, but children arrive as slots and
            stay server-rendered — no page becomes a client component. */}
        <AppShell>{children}</AppShell>
        <ToastViewport />
        <CursorLight />
      </body>
    </html>
  );
}
