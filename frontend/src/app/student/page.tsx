"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell, StatPill } from "@/components/Brand";
import { apiFetch, getStoredUser } from "@/lib/api";

interface HistoryItem {
  attempt_id: string;
  test_title: string;
  total_score: number | null;
  submitted_at: string | null;
  rank_in_batch: number | null;
}

interface Assignment {
  id: string;
  test_title: string;
  start_at: string;
  end_at: string;
  status: string;
}

export default function StudentDashboard() {
  const user = getStoredUser();
  const router = useRouter();
  const [hasHistory, setHasHistory] = useState<boolean | null>(null);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<HistoryItem[]>([]);
  const [openAssignments, setOpenAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<HistoryItem[]>("/api/tests/my-history").catch(() => [] as HistoryItem[]),
      apiFetch<Assignment[]>("/api/tests/my-assignments").catch(() => [] as Assignment[]),
    ])
      .then(([history, assignments]) => {
        const submitted = history.filter((h) => h.total_score != null);
        setHasHistory(submitted.length > 0);
        if (submitted.length > 0) {
          const avg =
            submitted.reduce((s, h) => s + (h.total_score ?? 0), 0) /
            submitted.length;
          setAvgScore(avg);
        }
        setRecentAttempts(submitted.slice(0, 3));
        setOpenAssignments(
          assignments.filter((a) => a.status === "open").slice(0, 3),
        );
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <AuthGuard roles={["student"]}>
      <PageShell title="My Dashboard">
        <p className="mb-4 text-sm text-zinc-400">
          Hello, {user?.full_name}
        </p>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <StatPill
            label="Avg Score"
            value={avgScore !== null ? avgScore.toFixed(1) : "—"}
          />
          <StatPill
            label="Tests"
            value={hasHistory ? recentAttempts.length + "+" : "0"}
          />
        </div>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {/* Open tests */}
        {openAssignments.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-bold text-white">
              Open Tests
            </h2>
            <div className="space-y-2">
              {openAssignments.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">
                        {a.test_title}
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Due {new Date(a.end_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        router.push(`/student/tests/${a.id}`)
                      }
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Start
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent results */}
        {recentAttempts.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-bold text-white">
              Recent Results
            </h2>
            <div className="space-y-2">
              {recentAttempts.map((a) => (
                <Card key={a.attempt_id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">
                        {a.test_title}
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        {a.total_score?.toFixed(1)} pts
                        {a.rank_in_batch != null &&
                          ` · Rank #${a.rank_in_batch}`}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        router.push(`/student/results/${a.attempt_id}`)
                      }
                      className="rounded-lg bg-[#3d4193]/40 px-3 py-1.5 text-xs font-semibold text-cyan-400"
                    >
                      View
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {hasHistory === false && (
          <Card>
            <h2 className="font-bold text-white">Welcome!</h2>
            <p className="mt-2 text-sm text-zinc-400">
              You haven&apos;t taken any tests yet. When your tutor assigns one,
              it will appear here.
            </p>
            <button
              onClick={() => router.push("/student/tests")}
              className="mt-4 inline-block rounded-lg bg-[#3d4193] px-4 py-2 text-sm font-semibold text-white"
            >
              View assigned tests
            </button>
          </Card>
        )}
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
