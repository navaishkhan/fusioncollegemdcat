"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell, StatPill } from "@/components/Brand";
import { apiFetch, clearAuth, getStoredUser } from "@/lib/api";

interface TutorStats {
  question_count: number;
  test_count: number;
  submission_count: number;
  enrolled_students: number;
  pending_manual_grading: number;
  pending_question_reviews: number;
  recent_submissions: {
    attempt_id: string;
    student_name: string;
    test_title: string;
    total_score: number | null;
    submitted_at: string | null;
  }[];
}

export default function TutorDashboard() {
  const user = getStoredUser();
  const router = useRouter();
  const [stats, setStats] = useState<TutorStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TutorStats>("/api/tests/tutor-stats")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Tutor Dashboard">
        <p className="mb-6 text-sm text-zinc-400 font-editorial">
          Welcome, <span className="text-white font-bold">{user?.full_name}</span>
        </p>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <StatPill label="Questions" value={stats?.question_count ?? "—"} />
          <StatPill label="Tests" value={stats?.test_count ?? "—"} />
          <StatPill label="Submissions" value={stats?.submission_count ?? "—"} />
          <StatPill label="Students" value={stats?.enrolled_students ?? "—"} />
        </div>

        {stats && stats.pending_manual_grading > 0 && (
          <button
            onClick={() => router.push("/tutor/grading")}
            className="mb-4 w-full rounded-xl border border-amber-500/50 bg-amber-500/10 py-3 text-sm font-bold text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2"
          >
            <span>{stats.pending_manual_grading} Pending Manual Grading</span>
          </button>
        )}

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <div className="mb-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push("/tutor/questions/new")}
            className="rounded-full glossy-border bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 py-3 text-sm font-editorial font-bold text-violet-300 hover:bg-violet-600 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(124,58,237,0.15)] hover:shadow-[0_0_25px_rgba(124,58,237,0.4)] cursor-pointer"
          >
            + New Question
          </button>
          <button
            onClick={() => router.push("/tutor/tests/new")}
            className="rounded-full glossy-border bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 py-3 text-sm font-editorial font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] cursor-pointer"
          >
            + New Test
          </button>
        </div>

        <button
          onClick={() => router.push("/tutor/analytics")}
          className="mb-6 w-full rounded-full glossy-border bg-[rgba(10,11,16,0.6)] py-3.5 text-sm font-editorial font-bold text-zinc-300 hover:bg-[rgba(255,255,255,0.05)] transition-all cursor-pointer"
        >
          View Analytics
        </button>

        {/* Recent submissions */}
        {stats && stats.recent_submissions.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-bold text-white">
              Recent Submissions
            </h2>
            <div className="space-y-2">
              {stats.recent_submissions.map((s) => (
                <Card key={s.attempt_id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {s.student_name}
                      </h3>
                      <p className="text-xs text-zinc-500">{s.test_title}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-cyan-400">
                        {s.total_score?.toFixed(1) ?? "—"}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {s.submitted_at
                          ? new Date(s.submitted_at).toLocaleDateString()
                          : ""}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            clearAuth();
            window.location.href = "/login";
          }}
          className="mt-6 w-full rounded-full glossy-border bg-[rgba(255,50,50,0.05)] py-3 text-sm font-editorial font-bold text-red-400/80 hover:bg-[rgba(255,50,50,0.15)] hover:text-red-400 transition-all cursor-pointer"
        >
          Sign out
        </button>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
