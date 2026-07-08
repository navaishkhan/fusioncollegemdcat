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
  ArrowRight,
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
    shadow: "shadow-cyan-500/10",
  },
  {
    label: "Question Bank",
    icon: HelpCircle,
    route: "/tutor/questions",
    color: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-500/10",
  },
  {
    label: "Tests",
    icon: ClipboardList,
    route: "/tutor/tests",
    color: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/10",
  },
  {
    label: "Batches",
    icon: Layers,
    route: "/tutor/batches",
    color: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/10",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    route: "/tutor/analytics",
    color: "from-rose-500 to-pink-600",
    shadow: "shadow-rose-500/10",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
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

  return (
    <AuthGuard roles={["admin"]}>
      <PageShell title="Admin Dashboard">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <p className="text-sm text-slate-400">
            Welcome back,{" "}
            <span className="text-white font-bold">{user?.full_name}</span>
          </p>
        </motion.div>

        {error && (
          <p className="mb-4 text-xs font-semibold text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mb-6 grid grid-cols-2 gap-3"
        >
          <motion.div variants={itemVariants}>
            <StatPill label="Total Users" value={stats?.total_users ?? "—"} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatPill label="Students" value={stats?.total_students ?? "—"} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatPill label="Questions" value={stats?.total_questions ?? "—"} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatPill label="Tests" value={stats?.total_tests ?? "—"} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatPill label="Submissions" value={stats?.total_submissions ?? "—"} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatPill label="Batches" value={stats?.total_batches ?? "—"} />
          </motion.div>
        </motion.div>

        {/* Navigation Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-2.5"
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1 mb-3">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Quick Actions</span>
          </h2>
          {navItems.map((item) => (
            <motion.div key={item.route} variants={itemVariants}>
              <Card onClick={() => router.push(item.route)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-xl bg-gradient-to-br ${item.color} p-2.5 shadow-md ${item.shadow}`}
                    >
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-white">
                      {item.label}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
