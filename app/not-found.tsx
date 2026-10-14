import { BackButton } from "@/components/BackButton";

/** Root 404 UI — also what notFound() renders for missing anime pages. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
      <p aria-hidden="true" className="text-6xl">
        🧭
      </p>
      <h1 className="text-2xl font-semibold text-zinc-50">
        We couldn&apos;t find that page
      </h1>
      <p className="max-w-md text-sm text-zinc-400">
        The anime you were after may have been removed, or the link is out of date.
      </p>
      <BackButton label="Back to home" />
    </main>
  );
}
