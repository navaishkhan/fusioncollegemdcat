"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell, StatPill } from "@/components/Brand";
import { apiFetch } from "@/lib/api";

interface AdminStats {
  total_users: number;
  total_students: number;
  total_tutors: number;
  total_parents: number;
  total_questions: number;
  total_tests: number;
  total_submissions: number;
  total_batches: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AdminStats>("/api/admin/stats")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <AuthGuard roles={["admin"]}>
      <PageShell title="Admin Dashboard">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <div className="mb-4 grid grid-cols-2 gap-3">
          <StatPill label="Users" value={stats?.total_users ?? "—"} />
          <StatPill label="Students" value={stats?.total_students ?? "—"} />
          <StatPill label="Questions" value={stats?.total_questions ?? "—"} />
          <StatPill label="Tests" value={stats?.total_tests ?? "—"} />
          <StatPill label="Submissions" value={stats?.total_submissions ?? "—"} />
          <StatPill label="Batches" value={stats?.total_batches ?? "—"} />
        </div>

        <div className="space-y-2">
          <button onClick={() => router.push("/admin/users")} className="w-full rounded-xl bg-[#3d4193] py-3 text-sm font-semibold text-white">
            Manage Users
          </button>
          <button onClick={() => router.push("/tutor/questions")} className="w-full rounded-xl bg-[#16192b] py-3 text-sm text-zinc-300">
            Question Bank
          </button>
          <button onClick={() => router.push("/tutor/tests")} className="w-full rounded-xl bg-[#16192b] py-3 text-sm text-zinc-300">
            Tests
          </button>
          <button onClick={() => router.push("/tutor/batches")} className="w-full rounded-xl bg-[#16192b] py-3 text-sm text-zinc-300">
            Batches
          </button>
          <button onClick={() => router.push("/tutor/analytics")} className="w-full rounded-xl bg-[#16192b] py-3 text-sm text-zinc-300">
            Analytics
          </button>
        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
