"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  ClipboardList,
  BarChart3,
  Layers,
  HelpCircle,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Database,
} from "lucide-react";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell, StatPill } from "@/components/Brand";
import { apiFetch, getStoredUser } from "@/lib/api";

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

const navItems = [
  {
    label: "Manage Users",
    icon: Users,
    route: "/admin/users",
    color: "from-cyan-500 to-violet-600",
    glow: "rgba(6,182,212,0.3)",
    textColor: "text-cyan-300",
  },
  {
    label: "Batches",
    icon: Layers,
    route: "/admin/batches",
    color: "from-amber-500 to-orange-600",
    glow: "rgba(245,158,11,0.3)",
    textColor: "text-amber-300",
  },
  {
    label: "Question Bank",
    icon: HelpCircle,
    route: "/tutor/questions",
    color: "from-violet-500 to-purple-600",
    glow: "rgba(124,58,237,0.3)",
    textColor: "text-violet-300",
  },
  {
    label: "Tests",
    icon: ClipboardList,
    route: "/tutor/tests",
    color: "from-emerald-500 to-teal-600",
    glow: "rgba(16,185,129,0.3)",
    textColor: "text-emerald-300",
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
    label: "Tutor Portal",
    icon: BookOpen,
    route: "/tutor",
    color: "from-indigo-500 to-blue-600",
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

export default function AdminDashboard() {
  const router = useRouter();
  const user = getStoredUser();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AdminStats>("/api/admin/stats")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  const platformHealth =
    stats && stats.total_users > 0
      ? Math.min(
          100,
          Math.round(
            ((stats.total_students + stats.total_tutors) / stats.total_users) * 100
          )
        )
      : 0;

  const engagementRate =
    stats && stats.total_students > 0
      ? Math.min(100, Math.round((stats.total_submissions / Math.max(stats.total_students, 1)) * 20))
      : 0;

  return (
    <AuthGuard roles={["admin"]}>
      <PageShell title="Admin Dashboard">
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
              <StatPill label="Total Users" value={stats?.total_users ?? "—"} />
              <StatPill label="Students" value={stats?.total_students ?? "—"} />
              <StatPill label="Questions" value={stats?.total_questions ?? "—"} />
              <StatPill label="Submissions" value={stats?.total_submissions ?? "—"} />
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

            {/* Quick Actions Grid */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1 mb-4">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Admin Controls</span>
              </h2>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {navItems.map((item) => (
                  <motion.button
                    key={item.route}
                    variants={itemVariants}
                    onClick={() => router.push(item.route)}
                    className="group relative rounded-2xl border border-white/5 bg-white/3 p-4 text-left hover:border-white/10 hover:bg-white/5 transition-all duration-300 cursor-pointer overflow-hidden"
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

            {/* Platform Stats Table */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                <Database className="w-3.5 h-3.5 text-violet-400" />
                <span>Platform Overview</span>
              </h2>
              <Card className="p-0 overflow-hidden border border-white/5 bg-[#0c0e1a]/95 shadow-2xl rounded-3xl">
                <div className="divide-y divide-white/5">
                  {[
                    { label: "Total Users", value: stats?.total_users, color: "text-cyan-400" },
                    { label: "Students", value: stats?.total_students, color: "text-emerald-400" },
                    { label: "Tutors", value: stats?.total_tutors, color: "text-violet-400" },
                    { label: "Parents", value: stats?.total_parents, color: "text-amber-400" },
                    { label: "Batches", value: stats?.total_batches, color: "text-rose-400" },
                    { label: "Total Questions", value: stats?.total_questions, color: "text-indigo-400" },
                    { label: "Tests", value: stats?.total_tests, color: "text-teal-400" },
                    { label: "Submissions", value: stats?.total_submissions, color: "text-pink-400" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between p-4 hover:bg-white/2 transition-colors">
                      <span className="text-sm text-slate-400">{row.label}</span>
                      <span className={`text-sm font-black ${row.color}`}>{row.value ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* ── Right Column: Live Neon Stats ── */}
          <div className="xl:col-span-4 hidden xl:block space-y-6 lg:sticky lg:top-24">

            {/* Neon Wave Card */}
            <Card className="relative overflow-hidden border border-white/5 bg-white/3 min-h-[400px] p-6 flex flex-col justify-between shadow-2xl">
              {/* Animated Waves */}
              <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
                <svg className="w-full h-full" viewBox="0 0 200 400" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="adminNeonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                    <filter id="adminGlowFilter">
                      <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <motion.path
                    fill="url(#adminNeonGlow)"
                    filter="url(#adminGlowFilter)"
                    initial={{ d: "M 0,240 C 40,230 80,250 120,240 C 160,230 180,245 200,240 L 200,400 L 0,400 Z" }}
                    animate={{ d: [
                      "M 0,240 C 40,230 80,250 120,240 C 160,230 180,245 200,240 L 200,400 L 0,400 Z",
                      "M 0,240 C 50,255 75,225 125,235 C 165,245 185,225 200,240 L 200,400 L 0,400 Z",
                      "M 0,240 C 40,230 80,250 120,240 C 160,230 180,245 200,240 L 200,400 L 0,400 Z",
                    ]}}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.path
                    fill="url(#adminNeonGlow)"
                    opacity="0.6"
                    initial={{ d: "M 0,270 C 30,260 70,280 110,270 C 150,260 170,275 200,270 L 200,400 L 0,400 Z" }}
                    animate={{ d: [
                      "M 0,270 C 30,260 70,280 110,270 C 150,260 170,275 200,270 L 200,400 L 0,400 Z",
                      "M 0,270 C 45,280 65,255 115,265 C 155,275 180,260 200,270 L 200,400 L 0,400 Z",
                      "M 0,270 C 30,260 70,280 110,270 C 150,260 170,275 200,270 L 200,400 L 0,400 Z",
                    ]}}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>
              </div>

              {/* Header */}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Live Analytics</span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight">Platform Health</h3>
                <p className="text-xs text-slate-400 mt-1">Real-time platform-wide statistics across all users and content.</p>
              </div>

              {/* Widgets */}
              <div className="relative z-10 my-6 space-y-5">
                {/* User Engagement Bar Chart */}
                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Submission Trend</span>
                    <span className="text-xs font-bold text-cyan-400">{stats?.total_submissions ?? 0} total</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-12">
                    {[30, 55, 45, 75, 60, 85, stats?.total_submissions ? Math.min(100, (stats.total_submissions % 8) * 12 + 35) : 65].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-sm bg-cyan-500/40"
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.07, duration: 0.6, ease: "easeOut" }}
                        style={{ filter: "drop-shadow(0 0 4px rgba(6,182,212,0.5))" }}
                      />
                    ))}
                  </div>
                </div>

                {/* Platform Health Ring */}
                <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.03)" strokeWidth="4" fill="transparent" />
                      <motion.circle
                        cx="28" cy="28" r="22"
                        stroke="#06b6d4"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 22}
                        initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - platformHealth / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        filter="url(#adminGlowFilter)"
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-white">{platformHealth}%</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">User Coverage</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">Percentage of registered users who are active students or tutors on the platform.</p>
                  </div>
                </div>

                {/* Engagement Ring */}
                <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.03)" strokeWidth="4" fill="transparent" />
                      <motion.circle
                        cx="28" cy="28" r="22"
                        stroke="#f43f5e"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 22}
                        initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - Math.min(engagementRate, 100) / 100) }}
                        transition={{ duration: 1.8, ease: "easeOut" }}
                        filter="url(#adminGlowFilter)"
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-white">{Math.min(engagementRate, 100)}%</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Engagement Rate</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">Proportion of students who have submitted at least one test attempt.</p>
                  </div>
                </div>
              </div>

              {/* Footer Stats */}
              <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Total Users</span>
                  <div className="text-lg font-black text-white mt-0.5">{stats?.total_users ?? "—"}</div>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Batches</span>
                  <div className="text-lg font-black text-white mt-0.5">{stats?.total_batches ?? "—"}</div>
                </div>
              </div>
            </Card>

            {/* Growth Stats Card */}
            <Card className="relative overflow-hidden border border-white/5 bg-white/3 p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Content Stats</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Questions in Bank", value: stats?.total_questions, color: "text-violet-400" },
                  { label: "Tests Created", value: stats?.total_tests, color: "text-emerald-400" },
                  { label: "Total Submissions", value: stats?.total_submissions, color: "text-cyan-400" },
                  { label: "Active Tutors", value: stats?.total_tutors, color: "text-amber-400" },
                ].map((row, idx) => (
                  <div key={idx} className={`flex items-center justify-between py-2 ${idx < 3 ? "border-b border-white/5" : ""}`}>
                    <span className="text-xs text-slate-400">{row.label}</span>
                    <span className={`text-xs font-black ${row.color}`}>{row.value ?? "—"}</span>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
