"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";

interface TestItem {
  id: string;
  title: string;
  duration_minutes: number;
  question_count: number;
  negative_marking: number;
}

export default function TutorTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<TestItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TestItem[]>("/api/tests")
      .then(setTests)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Tests">
        <button
          onClick={() => router.push("/tutor/tests/new")}
          className="mb-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
        >
          + New Test
        </button>
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <div className="space-y-3">
          {tests.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-white">{t.title}</h3>
                <button
                  onClick={() => router.push(`/tutor/tests/${t.id}/assign`)}
                  className="shrink-0 rounded-lg bg-[#3d4193] px-3 py-1 text-xs font-semibold text-white"
                >
                  Assign
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                <span>{t.question_count} questions</span>
                <span>{t.duration_minutes} min</span>
                <span>−{Math.abs(t.negative_marking)} wrong</span>
              </div>
            </Card>
          ))}
          {!error && tests.length === 0 && (
            <p className="text-center text-sm text-zinc-500">No tests created yet.</p>
          )}
        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
