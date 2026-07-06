"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";

interface Assignment {
  id: string;
  test_title: string;
  start_at: string;
  end_at: string;
  status: "open" | "upcoming" | "closed";
}

export default function StudentTestsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Assignment[]>("/api/tests/my-assignments")
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <AuthGuard roles={["student"]}>
      <PageShell title="My Tests">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-white">{a.test_title}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    a.status === "open"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : a.status === "upcoming"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-zinc-500/20 text-zinc-400"
                  }`}
                >
                  {a.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {new Date(a.start_at).toLocaleString()} — {new Date(a.end_at).toLocaleString()}
              </p>
              {a.status === "open" && (
                <button
                  onClick={() => router.push(`/student/tests/${a.id}`)}
                  className="mt-2 w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white"
                >
                  Start Test
                </button>
              )}
            </Card>
          ))}
          {!error && items.length === 0 && (
            <p className="text-center text-sm text-zinc-500">No assigned tests yet.</p>
          )}
        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
