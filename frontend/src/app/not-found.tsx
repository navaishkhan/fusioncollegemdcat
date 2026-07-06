import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0f1a] p-6 safe-top safe-bottom">
      <div className="text-6xl">404</div>
      <h1 className="mt-4 text-xl font-bold text-white">Page not found</h1>
      <p className="mt-2 text-sm text-zinc-400 text-center">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-[#3d4193] px-6 py-3 text-sm font-semibold text-white"
      >
        Go Home
      </Link>
    </div>
  );
}
