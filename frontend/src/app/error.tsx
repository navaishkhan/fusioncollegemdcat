"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0f1a] p-6 safe-top safe-bottom">
      <div className="text-6xl">⚠️</div>
      <h1 className="mt-4 text-xl font-bold text-white">Something went wrong</h1>
      <p className="mt-2 text-sm text-zinc-400 text-center max-w-md">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-[#3d4193] px-6 py-3 text-sm font-semibold text-white"
      >
        Try Again
      </button>
    </div>
  );
}
