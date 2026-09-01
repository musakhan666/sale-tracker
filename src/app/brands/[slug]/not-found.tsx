import Link from "next/link";

export default function BrandNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-text">Brand not found</h1>
      <p className="text-sm text-muted">We couldn&apos;t find a brand at this address.</p>
      <Link
        href="/brands"
        className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Browse all brands
      </Link>
    </main>
  );
}
