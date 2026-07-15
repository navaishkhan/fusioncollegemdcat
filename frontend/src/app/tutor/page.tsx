"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  HelpCircle,
  ClipboardList,
  CheckCircle2,
  Users,
  FileQuestion,
  AlertTriangle,
  ChevronRight,
  PenLine,
  BarChart3,
  BookOpen,
  Star,
} from "lucide-react";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell, StatPill } from "@/components/Brand";
import { apiFetch, clearAuth, getStoredUser } from "@/lib/api";

interface TutorStats {
  question_count: number;
  test_count: number;
  submission_count: number;
  enrolled_students: number;
  pending_manual_grading: number;
  pending_question_reviews: number;
  recent_submissions: {
    attempt_id: string;
    student_name: string;
    test_title: string;
    total_score: number | null;
    submitted_at: string | null;
  }[];
}

const quickActions = [
  {
    label: "New Question",
    icon: FileQuestion,
    route: "/tutor/questions/new",
    color: "from-violet-500 to-fuchsia-600",
    glow: "rgba(124,58,237,0.3)",
    textColor: "text-violet-300",
  },
  {
    label: "New Test",
    icon: ClipboardList,
    route: "/tutor/tests/new",
    color: "from-emerald-500 to-teal-600",
    glow: "rgba(16,185,129,0.3)",
    textColor: "text-emerald-300",
  },
  {
    label: "Grade Submissions",
    icon: PenLine,
    route: "/tutor/grading",
    color: "from-amber-500 to-orange-600",
    glow: "rgba(245,158,11,0.3)",
    textColor: "text-amber-300",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    route: "/tutor/analytics",
    color: "from-rose-500 to-pink-600",
    glow: "rgba(244,63,94,0.3)",
    textColor: "text-rose-300",
  },
  {
    label: "Question Bank",
    icon: HelpCircle,
    route: "/tutor/questions",
    color: "from-cyan-500 to-blue-600",
    glow: "rgba(6,182,212,0.3)",
    textColor: "text-cyan-300",
  },
  {
    label: "Review Requests",
    icon: Star,
    route: "/tutor/reviews",
    color: "from-indigo-500 to-violet-600",
    glow: "rgba(99,102,241,0.3)",
    textColor: "text-indigo-300",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
};

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

  const totalActivity = (stats?.submission_count ?? 0) + (stats?.question_count ?? 0);
  const gradingRatio =
    totalActivity > 0
      ? Math.round(((stats?.submission_count ?? 0) / Math.max(totalActivity, 1)) * 100)
      : 0;

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Tutor Dashboard">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

          {/* ── Left Column ── */}
          <div className="xl:col-span-8 space-y-6">
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-sm text-slate-400">
                Welcome back, <span className="text-white font-bold">{user?.full_name}</span>
              </p>
            </motion.div>

            {/* Mobile-only stat pills */}
            <div className="grid grid-cols-2 gap-4 xl:hidden">
              <StatPill label="Questions" value={stats?.question_count ?? "—"} />
              <StatPill label="Students" value={stats?.enrolled_students ?? "—"} />
              <StatPill label="Tests" value={stats?.test_count ?? "—"} />
              <StatPill label="Submissions" value={stats?.submission_count ?? "—"} />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-xs font-semibold text-red-400 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Pending alerts */}
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
              {stats && stats.pending_manual_grading > 0 && (
                <motion.button
                  variants={itemVariants}
                  onClick={() => router.push("/tutor/grading")}
                  className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/8 px-5 py-4 text-sm font-bold text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/50 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4" />
                    {stats.pending_manual_grading} Submissions Pending Manual Grading
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </motion.button>
              )}
              {stats && stats.pending_question_reviews > 0 && (
                <motion.button
                  variants={itemVariants}
                  onClick={() => router.push("/tutor/reviews")}
                  className="w-full rounded-2xl border border-violet-500/30 bg-violet-500/8 px-5 py-4 text-sm font-bold text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/50 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Star className="w-4 h-4" />
                    {stats.pending_question_reviews} Pending Review Requests
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </motion.button>
              )}
            </motion.div>

            {/* Quick Actions Grid */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1 mb-4">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Quick Actions</span>
              </h2>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {quickActions.map((item) => (
                  <motion.button
                    key={item.route}
                    variants={itemVariants}
                    onClick={() => router.push(item.route)}
                    className={`group relative rounded-2xl border border-white/5 bg-white/3 p-4 text-left hover:border-white/10 hover:bg-white/5 transition-all duration-300 cursor-pointer overflow-hidden`}
                    style={{ boxShadow: `0 0 0px ${item.glow}` }}
                    whileHover={{ boxShadow: `0 0 18px ${item.glow}` }}
                  >
                    <div className={`mb-3 w-9 h-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md`}>
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className={`text-xs font-bold ${item.textColor}`}>{item.label}</span>
                    <ChevronRight className="absolute bottom-3.5 right-3.5 w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </motion.button>
                ))}
              </motion.div>
            </div>

            {/* Recent Submissions */}
            {stats && stats.recent_submissions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Recent Submissions</span>
                </h2>
                <Card className="p-0 overflow-hidden border border-white/5 bg-[#0c0e1a]/95 shadow-2xl rounded-3xl">
                  <div className="max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 divide-y divide-white/5">
                    {stats.recent_submissions.map((s) => (
                      <div
                        key={s.attempt_id}
                        onClick={() => router.push(`/tutor/grading/${s.attempt_id}`)}
                        className="flex items-center justify-between p-4 hover:bg-white/3 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-emerald-500/10 p-2.5 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                            <Users className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{s.student_name}</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">{s.test_title}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-cyan-400">
                            {s.total_score != null ? `${s.total_score.toFixed(1)} pts` : <span className="text-amber-400 text-xs">Pending</span>}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Sign out */}
            <button
              onClick={() => { clearAuth(); window.location.href = "/login"; }}
              className="w-full rounded-full border border-red-500/10 bg-red-500/5 py-3 text-sm font-bold text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>

          {/* ── Right Column: Live Neon Stats ── */}
          <div className="xl:col-span-4 hidden xl:block space-y-6 lg:sticky lg:top-24">

            {/* Neon Wave Stats Card */}
            <Card className="relative overflow-hidden border border-white/5 bg-white/3 min-h-[400px] p-6 flex flex-col justify-between shadow-2xl">
              {/* Animated SVG Waves */}
              <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
                <svg className="w-full h-full" viewBox="0 0 200 400" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="tutorNeonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                    </linearGradient>
                    <filter id="tutorGlowFilter">
                      <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <motion.path
                    fill="url(#tutorNeonGlow)"
                    filter="url(#tutorGlowFilter)"
                    initial={{ d: "M 0,240 C 40,230 80,250 120,240 C 160,230 180,245 200,240 L 200,400 L 0,400 Z" }}
                    animate={{ d: [
                      "M 0,240 C 40,230 80,250 120,240 C 160,230 180,245 200,240 L 200,400 L 0,400 Z",
                      "M 0,240 C 50,255 75,225 125,235 C 165,245 185,225 200,240 L 200,400 L 0,400 Z",
                      "M 0,240 C 40,230 80,250 120,240 C 160,230 180,245 200,240 L 200,400 L 0,400 Z",
                    ]}}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.path
                    fill="url(#tutorNeonGlow)"
                    opacity="0.6"
                    initial={{ d: "M 0,270 C 30,260 70,280 110,270 C 150,260 170,275 200,270 L 200,400 L 0,400 Z" }}
                    animate={{ d: [
                      "M 0,270 C 30,260 70,280 110,270 C 150,260 170,275 200,270 L 200,400 L 0,400 Z",
                      "M 0,270 C 45,280 65,255 115,265 C 155,275 180,260 200,270 L 200,400 L 0,400 Z",
                      "M 0,270 C 30,260 70,280 110,270 C 150,260 170,275 200,270 L 200,400 L 0,400 Z",
                    ]}}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>
              </div>

              {/* Header */}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-violet-400 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Live Analytics</span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight">Teaching Summary</h3>
                <p className="text-xs text-slate-400 mt-1">Real-time stats based on your questions, tests, and student activity.</p>
              </div>

              {/* Widgets */}
              <div className="relative z-10 my-6 space-y-5">
                {/* Submission Trend Bar Chart */}
                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Student Activity</span>
                    <span className="text-xs font-bold text-violet-400">{stats?.submission_count ?? 0} submissions</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-12">
                    {[40, 65, 50, 80, 60, 90, stats?.submission_count ? Math.min(100, (stats.submission_count % 10) * 10 + 40) : 70].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-sm bg-violet-500/40"
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.07, duration: 0.6, ease: "easeOut" }}
                        style={{ filter: "drop-shadow(0 0 4px rgba(124,58,237,0.5))" }}
                      />
                    ))}
                  </div>
                </div>

                {/* Grading Completion Ring */}
                <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.03)" strokeWidth="4" fill="transparent" />
                      <motion.circle
                        cx="28" cy="28" r="22"
                        stroke="#7c3aed"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 22}
                        initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - gradingRatio / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        filter="url(#tutorGlowFilter)"
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-white">{gradingRatio}%</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Submission Rate</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">Ratio of student submissions to your total content. Keep adding questions and tests.</p>
                  </div>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Questions</span>
                  <div className="text-lg font-black text-white mt-0.5">{stats?.question_count ?? "—"}</div>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Students</span>
                  <div className="text-lg font-black text-white mt-0.5">{stats?.enrolled_students ?? "—"}</div>
                </div>
              </div>
            </Card>

            {/* Pending Alerts Card */}
            <Card className="relative overflow-hidden border border-white/5 bg-white/3 p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">Pending Actions</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-slate-400">Manual Grading</span>
                  <span className={`text-xs font-black ${(stats?.pending_manual_grading ?? 0) > 0 ? "text-amber-400" : "text-slate-600"}`}>
                    {stats?.pending_manual_grading ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-slate-400">Review Requests</span>
                  <span className={`text-xs font-black ${(stats?.pending_question_reviews ?? 0) > 0 ? "text-violet-400" : "text-slate-600"}`}>
                    {stats?.pending_question_reviews ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-slate-400">Tests Created</span>
                  <span className="text-xs font-black text-emerald-400">{stats?.test_count ?? 0}</span>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
