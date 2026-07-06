"use client";

import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import Link from "next/link";
import { getStoredUser } from "@/lib/api";

export default function ParentDashboard() {
  const user = getStoredUser();

  return (
    <AuthGuard roles={["parent"]}>
      <PageShell title="Parent Portal">
        <p className="mb-4 text-sm text-zinc-400">Welcome, {user?.full_name}</p>
        <Card>
          <h2 className="font-bold text-white">Track your child&apos;s progress</h2>
          <p className="mt-2 text-sm text-zinc-400">
            View MDCAT test scores, subject-wise performance, and trends over time.
          </p>
          <Link
            href="/parent/progress"
            className="mt-4 inline-block rounded-lg bg-[#3d4193] px-4 py-2 text-sm font-semibold text-white"
          >
            View progress
          </Link>
        </Card>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
