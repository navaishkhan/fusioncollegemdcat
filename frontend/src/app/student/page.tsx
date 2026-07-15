"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Eye, BookOpen, Clock, AlertCircle, ChevronRight } from "lucide-react";
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
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Dashboard core actions */}
          <div className="xl:col-span-8 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-1"
            >
              <p className="text-sm text-slate-400">
                Welcome back, <span className="text-white font-bold">{user?.full_name}</span>
              </p>
            </motion.div>

            {/* Stats Pills for mobile/tablet */}
            <div className="grid grid-cols-2 gap-4 xl:hidden">
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
                          <button className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer relative overflow-hidden group">
                            <span className="relative z-10">Begin</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                          <button className="flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-5 py-2 text-xs font-bold text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer relative overflow-hidden group">
                            <span className="relative z-10">View</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                      className="mt-6 rounded-full glossy-border bg-gradient-to-r from-cyan-500/80 to-violet-600/80 hover:from-cyan-400 hover:to-violet-500 px-7 py-3.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer transition-all duration-300"
                    >
                      View Assigned Tests
                    </motion.button>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Right Column: Live Neon Fluid Stats sidebar on desktop */}
          <div className="xl:col-span-4 hidden xl:block space-y-6 lg:sticky lg:top-24">
            
            {/* Main Stats Card with Wave Flow */}
            <Card className="relative overflow-hidden border border-white/5 bg-white/3 min-h-[380px] p-6 flex flex-col justify-between shadow-2xl">
              {/* Animated flowing neon water SVG */}
              <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
                <svg className="w-full h-full" viewBox="0 0 200 400" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glowFilter">
                      <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Wave 1 */}
                  <motion.path
                    fill="url(#neonGlow)"
                    filter="url(#glowFilter)"
                    initial={{ d: "M 0,250 C 40,240 80,260 120,250 C 160,240 180,255 200,250 L 200,400 L 0,400 Z" }}
                    animate={{
                      d: [
                        "M 0,250 C 40,240 80,260 120,250 C 160,240 180,255 200,250 L 200,400 L 0,400 Z",
                        "M 0,250 C 50,265 75,235 125,245 C 165,255 185,235 200,250 L 200,400 L 0,400 Z",
                        "M 0,250 C 40,240 80,260 120,250 C 160,240 180,255 200,250 L 200,400 L 0,400 Z"
                      ]
                    }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {/* Wave 2 */}
                  <motion.path
                    fill="url(#neonGlow)"
                    opacity="0.6"
                    initial={{ d: "M 0,280 C 30,270 70,290 110,280 C 150,270 170,285 200,280 L 200,400 L 0,400 Z" }}
                    animate={{
                      d: [
                        "M 0,280 C 30,270 70,290 110,280 C 150,270 170,285 200,280 L 200,400 L 0,400 Z",
                        "M 0,280 C 45,290 65,265 115,275 C 155,285 180,270 200,280 L 200,400 L 0,400 Z",
                        "M 0,280 C 30,270 70,290 110,280 C 150,270 170,285 200,280 L 200,400 L 0,400 Z"
                      ]
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>
              </div>

              {/* Title & Headline */}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Live Analytics</span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight">Performance Summary</h3>
                <p className="text-xs text-slate-400 mt-1">Real-time statistics based on your active test attempts.</p>
              </div>

              {/* Mini Neon Graphs / Circular widgets overlay */}
              <div className="relative z-10 my-6 space-y-5">
                {/* Score trend chart (Neon path outline) */}
                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score Progress</span>
                    <span className="text-xs font-bold text-cyan-400">+{avgScore ? (avgScore * 10).toFixed(0) : "0"}%</span>
                  </div>
                  <div className="h-16 relative">
                    <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                      {/* Grid lines */}
                      <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      {/* Neon line */}
                      <path
                        d="M 0,25 Q 20,22 40,15 T 80,10 T 100,5"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="1.5"
                        filter="url(#glowFilter)"
                      />
                      {/* Area glow */}
                      <path
                        d="M 0,25 Q 20,22 40,15 T 80,10 T 100,5 L 100,30 L 0,30 Z"
                        fill="url(#neonGlow)"
                        opacity="0.3"
                      />
                    </svg>
                  </div>
                </div>

                {/* Accuracy Widget (Glow Ring) */}
                <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-black/20 p-4">
                  {/* SVG mini circle */}
                  <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.03)" strokeWidth="4" fill="transparent" />
                      <motion.circle
                        cx="28"
                        cy="28"
                        r="22"
                        stroke="#7c3aed"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 22}
                        initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - 0.74) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        filter="url(#glowFilter)"
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-white">74%</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">MDCAT Target Accuracy</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">Required average correctness threshold for top medical colleges.</p>
                  </div>
                </div>
              </div>

              {/* Stats Footer Details */}
              <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Average score</span>
                  <div className="text-lg font-black text-white mt-0.5">{avgScore !== null ? `${avgScore.toFixed(1)} pts` : "—"}</div>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Total attempts</span>
                  <div className="text-lg font-black text-white mt-0.5">{totalTests}</div>
                </div>
              </div>
            </Card>

            {/* Support Widget */}
            <Card className="border border-white/5 bg-white/3 p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-600/10 to-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2">Need Guidance?</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">Request a consultation with your tutor to review question trends and batches.</p>
              <button onClick={() => router.push("/profile")} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer">
                <span>View My Profile</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Card>
          </div>

        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
