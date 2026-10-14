import Link from "next/link";

interface BackButtonProps {
  /** Where the button goes; defaults to the home page. */
  href?: string;
  label?: string;
}

/** Pill-style link back to the previous browsing context. */
export function BackButton({ href = "/", label = "Back" }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-accent/60 hover:bg-accent/10 hover:text-zinc-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}
