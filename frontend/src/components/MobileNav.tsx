"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Home,
  Users,
  BookOpen,
  FileText,
  Layers,
  BarChart3,
  User,
  History,
  TrendingUp,
  LogOut,
  Menu,
  X,
  Loader2,
  ClipboardCheck,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { dashboardPath, getStoredUser, clearAuth, apiFetch } from "@/lib/api";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home: Home,
  Users: Users,
  Bank: BookOpen,
  Tests: FileText,
  Batches: Layers,
  Analytics: BarChart3,
  Grading: ClipboardCheck,
  Reviews: MessageSquare,
  Profile: User,
  History: History,
  Progress: TrendingUp,
};

const NAV: Record<string, { href: string; label: string }[]> = {
  admin: [
    { href: "/admin", label: "Home" },
    { href: "/admin/users", label: "Users" },
    { href: "/tutor/questions", label: "Bank" },
    { href: "/tutor/tests", label: "Tests" },
    { href: "/admin/batches", label: "Batches" },
    { href: "/tutor/analytics", label: "Analytics" },
    { href: "/profile", label: "Profile" },
  ],
  tutor: [
    { href: "/tutor", label: "Home" },
    { href: "/tutor/questions", label: "Bank" },
    { href: "/tutor/tests", label: "Tests" },
    { href: "/tutor/batches", label: "Batches" },
    { href: "/tutor/grading", label: "Grading" },
    { href: "/tutor/reviews", label: "Reviews" },
    { href: "/tutor/analytics", label: "Analytics" },
    { href: "/profile", label: "Profile" },
  ],
  student: [
    { href: "/student", label: "Home" },
    { href: "/student/tests", label: "Tests" },
    { href: "/student/history", label: "History" },
    { href: "/profile", label: "Profile" },
  ],
  parent: [
    { href: "/parent", label: "Home" },
    { href: "/parent/progress", label: "Progress" },
    { href: "/profile", label: "Profile" },
  ],
};

// Primary nav shown in the bottom bar (most important 3 items)
const PRIMARY_NAV: Record<string, { href: string; label: string }[]> = {
  admin: [
    { href: "/admin", label: "Home" },
    { href: "/admin/users", label: "Users" },
    { href: "/tutor/tests", label: "Tests" },
  ],
  tutor: [
    { href: "/tutor", label: "Home" },
    { href: "/tutor/questions", label: "Bank" },
    { href: "/tutor/tests", label: "Tests" },
  ],
  student: [
    { href: "/student", label: "Home" },
    { href: "/student/tests", label: "Tests" },
    { href: "/student/history", label: "History" },
  ],
  parent: [
    { href: "/parent", label: "Home" },
    { href: "/parent/progress", label: "Progress" },
  ],
};

// Secondary nav shown in the "More" drawer
const SECONDARY_NAV: Record<string, { href: string; label: string }[]> = {
  admin: [
    { href: "/tutor/questions", label: "Bank" },
    { href: "/admin/batches", label: "Batches" },
    { href: "/tutor/analytics", label: "Analytics" },
    { href: "/profile", label: "Profile" },
  ],
  tutor: [
    { href: "/tutor/batches", label: "Batches" },
    { href: "/tutor/grading", label: "Grading" },
    { href: "/tutor/reviews", label: "Reviews" },
    { href: "/tutor/analytics", label: "Analytics" },
    { href: "/profile", label: "Profile" },
  ],
  student: [
    { href: "/profile", label: "Profile" },
  ],
  parent: [
    { href: "/profile", label: "Profile" },
  ],
};

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname(); // ✅ reactive — updates on navigation
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>({ role: "student" });
  const [stats, setStats] = useState<{ pending_question_reviews?: number; pending_manual_grading?: number } | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (u) {
      setUser(u);
      if (u.role === "admin" || u.role === "tutor") {
        apiFetch<any>("/api/tests/tutor-stats")
          .then((res) => setStats(res))
          .catch(() => {});
      }
    }
  }, []);

  // Close drawer when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Don't show nav on exam pages
  if (pathname?.includes("/student/tests/") && pathname !== "/student/tests") return null;

  const allItems = NAV[user.role] || [];
  const primaryItems = PRIMARY_NAV[user.role] || [];
  const secondaryItems = SECONDARY_NAV[user.role] || [];

  const handleLogout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  const getBadge = (label: string) => {
    if (label === "Reviews" && stats?.pending_question_reviews) return stats.pending_question_reviews;
    if (label === "Grading" && stats?.pending_manual_grading) return stats.pending_manual_grading;
    return null;
  };

  return (
    <>
      {/* ── Mobile Floating Bottom Nav ── */}
      <nav
        className="fixed bottom-4 left-3 right-3 z-35 md:hidden glass-panel border border-white/8 rounded-2xl shadow-2xl safe-bottom"
        style={{ backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center justify-around">
          {primaryItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"));
            const Icon = ICON_MAP[item.label] || BookOpen;
            const badge = getBadge(item.label);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center flex-1 py-3 px-1 text-[10px] font-bold rounded-xl transition-all duration-300 min-h-[56px] touch-manipulation ${
                  active ? "text-cyan-400" : "text-slate-400 hover:text-white"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-pill-mobile"
                    className="absolute inset-x-1 inset-y-1 bg-[#7c3aed]/15 rounded-xl border border-[#7c3aed]/20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <Icon className={`w-5 h-5 mb-1 relative z-10 ${active ? "text-cyan-400" : "text-slate-400"}`} />
                  {badge ? (
                    <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-[#0c0e1a]">
                      {badge}
                    </span>
                  ) : null}
                </div>
                <span className="relative z-10 text-[9px] tracking-tight leading-none">{item.label}</span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="relative flex flex-col items-center justify-center flex-1 py-3 px-1 text-[10px] font-bold rounded-xl text-slate-400 hover:text-white transition-all duration-300 min-h-[56px] touch-manipulation"
          >
            <Menu className="w-5 h-5 mb-1" />
            <span className="text-[9px] tracking-tight leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0c0e1a]/96 backdrop-blur-2xl border-t border-white/8 rounded-t-3xl shadow-2xl safe-bottom"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>

              <div className="px-5 pb-6 max-h-[75vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Fusion MDCAT</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest capitalize">{user.role} Portal</p>
                  </div>
                  <button
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close menu"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all touch-manipulation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Secondary Nav Grid */}
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  {secondaryItems.map((item) => {
                    const active = pathname === item.href;
                    const Icon = ICON_MAP[item.label] || BookOpen;
                    const badge = getBadge(item.label);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 min-h-[80px] touch-manipulation ${
                          active
                            ? "bg-[#7c3aed]/10 border-[#7c3aed]/30 text-cyan-400"
                            : "bg-white/3 border-white/8 text-slate-400 hover:text-white hover:border-white/15 hover:bg-white/6"
                        }`}
                      >
                        <div className="relative">
                          <Icon className="w-6 h-6 mb-2" />
                          {badge ? (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                              {badge}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs font-semibold leading-none">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Sign Out */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600/20 hover:border-rose-500/35 text-sm font-bold transition-all touch-manipulation min-h-[52px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop Left Sidebar ── */}
      <aside className="hidden md:flex flex-col fixed left-4 top-4 bottom-4 w-64 rounded-3xl glass-panel glossy-border bg-[rgba(12,14,26,0.65)] backdrop-blur-3xl shadow-2xl py-6 px-4 z-30 justify-between">
        {/* Logo */}
        <div className="flex flex-col flex-1 overflow-y-auto scrollbar-none space-y-6 pb-4">
          <Link
            href="/"
            className="px-3 py-2 flex items-center gap-3 hover:opacity-85 transition-opacity group rounded-2xl hover:bg-white/3"
          >
            <Image
              src="/logo.png"
              alt="Fusion College Logo"
              width={40}
              height={40}
              className="rounded-full border border-white/10 bg-white object-contain shadow-md transition-transform duration-300 group-hover:rotate-12"
              priority
            />
            <div>
              <h2 className="text-sm font-black tracking-widest text-white uppercase">FUSION MDCAT</h2>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest capitalize">
                {user.role} Portal
              </div>
            </div>
          </Link>

          {/* Nav Items */}
          <div className="space-y-1">
            {allItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" &&
                  item.href.length > 1 &&
                  pathname?.startsWith(item.href + "/"));
              const Icon = ICON_MAP[item.label] || BookOpen;
              const badge = getBadge(item.label);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 group min-h-[48px] touch-manipulation ${
                    active ? "text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="active-pill-desktop"
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 to-purple-500/15 rounded-2xl border border-cyan-500/25"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {!active && (
                    <div className="absolute inset-0 bg-white/0 rounded-2xl transition-all duration-200 group-hover:bg-white/4" />
                  )}
                  <div
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                      active
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "bg-white/5 text-slate-400 group-hover:bg-white/8 group-hover:text-cyan-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="relative z-10 flex-1 transition-transform duration-200 group-hover:translate-x-0.5">
                    {item.label}
                  </span>
                  {badge ? (
                    <span className="relative z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500/20 border border-rose-500/30 px-1.5 text-[10px] font-bold text-rose-400">
                      {badge}
                    </span>
                  ) : null}
                  {active && (
                    <ChevronRight className="relative z-10 w-3.5 h-3.5 text-cyan-400/60" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sign Out — always visible */}
        <div className="pt-4 border-t border-white/5 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl text-sm font-bold text-rose-400 bg-rose-500/8 hover:bg-rose-500/15 transition-all cursor-pointer border border-rose-500/15 hover:border-rose-500/30 min-h-[48px] touch-manipulation group"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function AuthGuard({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace(dashboardPath(user.role));
      return;
    }
    setAuthorized(true);
  }, [roles, router]);

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0c0e1a]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return <>{children}</>;
}
