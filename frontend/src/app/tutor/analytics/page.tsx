"use client";

import { useEffect, useState } from "react";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch, formatSubjectName } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface WeakTopic {
  topic: string;
  subject: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface TrendPoint {
  attempt_id: string;
  test_title: string;
  student_name: string;
  total_score: number;
  submitted_at: string;
  subject_breakdown: Record<string, { score: number }> | null;
}

export default function AnalyticsPage() {
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<WeakTopic[]>("/api/admin/analytics/weak-topics"),
      apiFetch<TrendPoint[]>("/api/admin/analytics/trends"),
    ])
      .then(([topics, trendData]) => {
        setWeakTopics(topics);
        setTrends(trendData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Simple bar chart as colored bars
  const maxAccuracy = Math.max(...weakTopics.map((t) => t.accuracy), 100);

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Analytics">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : (
          <>
            {/* Weak topics */}
        {weakTopics.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-bold text-white">Topic Accuracy</h2>
            <div className="space-y-2">
              {weakTopics
                .sort((a, b) => a.accuracy - b.accuracy)
                .slice(0, 15)
                .map((t, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 truncate">{t.topic}</span>
                      <span className="text-zinc-500 ml-2">{t.subject}</span>
                      <span className={`font-bold ${t.accuracy < 50 ? "text-red-400" : t.accuracy < 70 ? "text-amber-400" : "text-emerald-400"}`}>
                        {t.accuracy}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[#0a0c14] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${t.accuracy < 50 ? "bg-red-500" : t.accuracy < 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${(t.accuracy / maxAccuracy) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-600">{t.correct}/{t.total} correct</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Score trends */}
        {trends.length > 1 && (
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-bold text-white">Score Trends</h2>
            <Card>
              <div className="flex items-end gap-1.5 h-32">
                {trends.map((t, i) => {
                  const maxScore = Math.max(...trends.map((x) => x.total_score), 1);
                  const height = (t.total_score / maxScore) * 100;
                  const barColor = t.total_score >= maxScore * 0.7 ? "bg-emerald-500" : t.total_score >= maxScore * 0.4 ? "bg-amber-500" : "bg-red-500";
                  return (
                    <div key={t.attempt_id} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex-1 w-full flex items-end">
                        <div
                          className={`w-full rounded-t ${barColor} min-h-[4px]`}
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${t.test_title}: ${t.total_score}`}
                        />
                      </div>
                      <span className="text-[8px] text-zinc-600 rotate-45 origin-left whitespace-nowrap">
                        {new Date(t.submitted_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Per-subject breakdown from trends */}
        {trends.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-bold text-white">Subject Scores (Last Test)</h2>
            <Card>
              {trends[trends.length - 1].subject_breakdown ? (
                Object.entries(trends[trends.length - 1].subject_breakdown!).map(([subject, data]) => (
                  <div key={subject} className="flex items-center justify-between py-1.5">
                    <span className="text-sm capitalize text-zinc-300">{formatSubjectName(subject)}</span>
                    <span className="text-sm font-bold text-cyan-400">{data.score.toFixed(1)}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500">No breakdown data</p>
              )}
            </Card>
          </div>
        )}

            {weakTopics.length === 0 && trends.length === 0 && !error && (
              <p className="text-sm text-zinc-500">No analytics data yet. Data appears after students submit tests.</p>
            )}
          </>
        )}
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
