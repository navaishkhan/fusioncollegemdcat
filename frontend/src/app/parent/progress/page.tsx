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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Progress[]>("/api/parent/progress")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <AuthGuard roles={["parent"]}>
      <PageShell title="Children&apos;s Progress">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <div className="space-y-3">
          {rows.map((r, i) => (
            <Card key={i}>
              <h3 className="font-bold text-white">{r.student.full_name}</h3>
              <p className="text-xs text-zinc-500">{r.student.email}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-zinc-500">Attempts</span>
                  <div className="font-bold text-cyan-400">{r.total_attempts}</div>
                </div>
                <div>
                  <span className="text-zinc-500">Avg score</span>
                  <div className="font-bold text-cyan-400">
                    {r.average_score != null ? r.average_score.toFixed(1) : "—"}
                  </div>
                </div>
              </div>
              {r.recent_scores.length > 0 && (
                <p className="mt-2 text-xs text-zinc-400">
                  Recent: {r.recent_scores.map((s) => s.toFixed(1)).join(", ")}
                </p>
              )}
            </Card>
          ))}
          {!error && rows.length === 0 && (
            <p className="text-center text-sm text-zinc-500">
              No linked children yet. Admin can link students to your parent account.
            </p>
          )}
        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
