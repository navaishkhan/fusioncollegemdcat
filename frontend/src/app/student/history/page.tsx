"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";

interface HistoryItem {
  attempt_id: string;
  test_title: string;
  batch_name: string;
  status: string;
  total_score: number | null;
  subject_breakdown: Record<string, { correct: number; wrong: number; skipped: number; score: number }> | null;
  rank_in_batch: number | null;
  started_at: string;
  submitted_at: string | null;
}

export default function StudentHistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<HistoryItem[]>("/api/tests/my-history")
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);

  const totalCorrect = items.reduce(
    (sum, item) =>
      sum +
      (item.subject_breakdown
        ? Object.values(item.subject_breakdown).reduce((s, sb) => s + sb.correct, 0)
        : 0),
    0,
  );
  const totalWrong = items.reduce(
    (sum, item) =>
      sum +
      (item.subject_breakdown
        ? Object.values(item.subject_breakdown).reduce((s, sb) => s + sb.wrong, 0)
        : 0),
    0,
  );

  return (
    <AuthGuard roles={["student"]}>
      <PageShell title="Results History">
        {items.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-600/10 p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{totalCorrect}</div>
              <div className="text-[10px] uppercase text-emerald-500/80">All-time correct</div>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-600/10 p-3 text-center">
              <div className="text-lg font-bold text-red-400">{totalWrong}</div>
              <div className="text-[10px] uppercase text-red-500/80">All-time wrong</div>
            </div>
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <div className="space-y-3">
          {items.map((item) => {
            const isSubmitted = item.status === "submitted";
            return (
              <Card key={item.attempt_id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white">{item.test_title}</h3>
                    <p className="text-xs text-zinc-500">{item.batch_name}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      isSubmitted
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {isSubmitted ? "Graded" : "In Progress"}
                  </span>
                </div>

                {isSubmitted && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-sm font-bold text-cyan-400">
                        {item.total_score?.toFixed(1) ?? "—"}
                      </div>
                      <div className="text-zinc-500">Score</div>
                    </div>
                    {item.rank_in_batch != null && (
                      <div>
                        <div className="text-sm font-bold text-amber-300">
                          #{item.rank_in_batch}
                        </div>
                        <div className="text-zinc-500">Rank</div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold text-zinc-300">
                        {item.submitted_at
                          ? new Date(item.submitted_at).toLocaleDateString()
                          : "—"}
                      </div>
                      <div className="text-zinc-500">Date</div>
                    </div>
                  </div>
                )}

                {isSubmitted && (
                  <button
                    onClick={() => router.push(`/student/results/${item.attempt_id}`)}
                    className="mt-3 w-full rounded-lg bg-[#3d4193]/40 py-2 text-xs font-semibold text-cyan-400"
                  >
                    View Result
                  </button>
                )}
              </Card>
            );
          })}
          {!error && items.length === 0 && (
            <p className="text-center text-sm text-zinc-500">
              No attempts yet. Take a test to see results here.
            </p>
          )}
        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
