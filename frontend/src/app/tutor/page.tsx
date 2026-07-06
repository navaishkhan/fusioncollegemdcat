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
        <p className="mb-4 text-sm text-zinc-400">
          Welcome, {user?.full_name}
        </p>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <StatPill label="Questions" value={stats?.question_count ?? "—"} />
          <StatPill label="Tests" value={stats?.test_count ?? "—"} />
          <StatPill label="Submissions" value={stats?.submission_count ?? "—"} />
          <StatPill label="Students" value={stats?.enrolled_students ?? "—"} />
        </div>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => router.push("/tutor/questions/new")}
            className="rounded-xl bg-[#3d4193] py-3 text-sm font-semibold text-white"
          >
            + New Question
          </button>
          <button
            onClick={() => router.push("/tutor/tests/new")}
            className="rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
          >
            + New Test
          </button>
        </div>

        <button
          onClick={() => router.push("/tutor/analytics")}
          className="mb-4 w-full rounded-xl bg-[#16192b] py-2.5 text-sm text-zinc-300"
        >
          📊 View Analytics
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
          className="mt-4 w-full rounded-xl bg-[#16192b] py-3 text-sm text-zinc-400"
        >
          Sign out
        </button>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
