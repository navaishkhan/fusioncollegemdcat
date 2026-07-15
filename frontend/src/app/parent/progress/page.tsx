"use client";

import { useEffect, useState } from "react";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";

interface Progress {
  student: { full_name: string; email: string };
  total_attempts: number;
  average_score: number | null;
  recent_scores: number[];
}

export default function ParentProgressPage() {
  const [rows, setRows] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<Progress[]>("/api/parent/progress")
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard roles={["parent"]}>
      <PageShell title="Children&apos;s Progress">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {loading ? (
          <div className="flex justify-center p-8">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => (
              <Card key={i}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-sm font-bold text-cyan-400">
                    {r.student.full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white leading-tight">{r.student.full_name}</h3>
                    <p className="text-xs text-zinc-500">{r.student.email}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/5 bg-white/3 p-4 text-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Total Attempts</span>
                    <div className="mt-1 text-2xl font-black text-cyan-400">{r.total_attempts}</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/3 p-4 text-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Avg Score</span>
                    <div className="mt-1 text-2xl font-black text-purple-400">
                      {r.average_score != null ? r.average_score.toFixed(1) : "—"}
                    </div>
                  </div>
                </div>

                {r.recent_scores.length > 0 && (
                  <div className="mt-4 border-t border-white/5 pt-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Recent Scores</span>
                    <div className="mt-1.5 flex gap-1.5 flex-wrap">
                      {r.recent_scores.map((score, idx) => (
                        <span key={idx} className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 text-xs font-black text-cyan-400">
                          {score.toFixed(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
            {rows.length === 0 && (
              <p className="text-center text-sm text-zinc-500 py-8 leading-relaxed">
                No linked children yet.<br />
                <span className="text-xs text-zinc-600 font-bold uppercase tracking-wider">Admin can link students to your parent account.</span>
              </p>
            )}
          </div>
        )}
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
