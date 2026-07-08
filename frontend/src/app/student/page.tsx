"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Eye, BookOpen, Clock, AlertCircle } from "lucide-react";
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
  const [totalTests, setTotalTests] = useState<number>(0);
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
        setTotalTests(submitted.length);
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

  const listContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
  };

  return (
    <AuthGuard roles={["student"]}>
      <PageShell title="Dashboard">
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <p className="text-sm text-slate-400">
            Welcome back, <span className="text-white font-bold">{user?.full_name}</span>
          </p>
        </motion.div>

        {/* Stats Section */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <StatPill
            label="Average Score"
            value={avgScore !== null ? `${avgScore.toFixed(1)} pts` : "—"}
          />
          <StatPill
            label="Total Tests"
            value={totalTests > 0 ? `${totalTests}` : "0"}
          />
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="mb-4 rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-xs font-semibold text-red-400 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <motion.div
          variants={listContainerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Open tests */}
          {openAssignments.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active Assignments</span>
              </h2>
              <div className="space-y-2.5">
                {openAssignments.map((a) => (
                  <Card key={a.id} onClick={() => router.push(`/student/tests/${a.id}`)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-emerald-500/10 p-2.5 mt-0.5 border border-emerald-500/20">
                          <Play className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white leading-tight">
                            {a.test_title}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-semibold mt-1">
                            Due: {new Date(a.end_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <button className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all cursor-pointer">
                        <span>Begin</span>
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recent results */}
          {recentAttempts.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Recent Performances</span>
              </h2>
              <div className="space-y-2.5">
                {recentAttempts.map((a) => (
                  <Card key={a.attempt_id} onClick={() => router.push(`/student/results/${a.attempt_id}`)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-cyan-500/10 p-2.5 mt-0.5 border border-cyan-500/20">
                          <Eye className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white leading-tight">
                            {a.test_title}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-semibold mt-1">
                            Score: <span className="text-cyan-400 font-bold">{a.total_score?.toFixed(1)} pts</span>
                            {a.rank_in_batch != null && (
                              <>
                                <span className="mx-1.5">·</span>
                                Rank: <span className="text-amber-400 font-bold">#{a.rank_in_batch}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <button className="flex items-center gap-1 rounded-xl bg-[#7c3aed]/15 border border-[#7c3aed]/30 px-3.5 py-2 text-xs font-bold text-cyan-400 hover:bg-[#7c3aed]/25 transition-all cursor-pointer">
                        <span>View</span>
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {hasHistory === false && (
            <motion.div variants={itemVariants}>
              <Card className="text-center py-8">
                <div className="mx-auto w-12 h-12 rounded-full bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-[#7c3aed]" />
                </div>
                <h2 className="text-lg font-extrabold text-white tracking-tight">Welcome to Fusion MDCAT</h2>
                <p className="mt-2 text-sm text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                  Your assigned mock tests and exams will appear here as soon as they are assigned by your tutor.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push("/student/tests")}
                  className="mt-6 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-3 text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  View Assigned Tests
                </motion.button>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
