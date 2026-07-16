"use client";

import { useEffect, useState, useCallback } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { dashboardPath, getStoredUser, clearAuth, apiFetch } from "@/lib/api";

/* ────────────────────────────────────────────────────────── */
/* Icon map                                                    */
/* ────────────────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────────────── */
/* Nav definitions                                            */
/* ────────────────────────────────────────────────────────── */
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

/* Primary nav shown in mobile bottom bar */
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

/* Secondary nav in mobile "More" drawer */
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
  student: [{ href: "/profile", label: "Profile" }],
  parent: [{ href: "/profile", label: "Profile" }],
};

/* ────────────────────────────────────────────────────────── */
/* Constants                                                   */
/* ────────────────────────────────────────────────────────── */
const RAIL_W = 68;   // collapsed width in px
const FULL_W = 256;  // expanded width in px

/* ────────────────────────────────────────────────────────── */
/* Main component                                              */
/* ────────────────────────────────────────────────────────── */
export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>({ role: "student" });
  const [stats, setStats] = useState<{
    pending_question_reviews?: number;
    pending_manual_grading?: number;
  } | null>(null);

  // Sidebar open/closed state — persisted in localStorage
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);

  // Load pin preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-pinned");
    if (saved === "true") {
      setPinned(true);
      setExpanded(true);
    }
  }, []);

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

  // Close mobile drawer when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Don't show nav on exam and results pages
  if (pathname?.includes("/student/tests/") && pathname !== "/student/tests") return null;
  if (pathname?.includes("/student/results/")) return null;

  const allItems = NAV[user.role] || [];
  const primaryItems = PRIMARY_NAV[user.role] || [];
  const secondaryItems = SECONDARY_NAV[user.role] || [];
  const isOpen = pinned || hovered; // sidebar shows full labels when pinned OR hovered

  useEffect(() => {
    const width = isOpen ? `${FULL_W}px` : `${RAIL_W}px`;
    document.documentElement.style.setProperty("--sidebar-width", width);
  }, [isOpen]);

  const handleLogout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    setExpanded(next);
    localStorage.setItem("sidebar-pinned", String(next));
  };

  const getBadge = (label: string) => {
    if (label === "Reviews" && stats?.pending_question_reviews)
      return stats.pending_question_reviews;
    if (label === "Grading" && stats?.pending_manual_grading)
      return stats.pending_manual_grading;
    return null;
  };

  const isActive = (href: string) => {
    const isDashboard = href === "/tutor" || href === "/admin" || href === "/student" || href === "/parent";
    if (isDashboard) {
      return pathname === href;
    }
    return (
      pathname === href ||
      (href !== "/" && href.length > 1 && pathname?.startsWith(href + "/"))
    );
  };

  return (
    <>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MOBILE: Floating bottom bar                            */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav
        className="fixed bottom-4 left-3 right-3 z-35 md:hidden glass-panel border border-white/8 rounded-2xl shadow-2xl safe-bottom"
        style={{ backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center justify-around">
          {primaryItems.map((item) => {
            const active = isActive(item.href);
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

          {/* More button */}
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MOBILE: Slide-up drawer                                */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0c0e1a]/96 backdrop-blur-2xl border-t border-white/8 rounded-t-3xl shadow-2xl safe-bottom"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>
              <div className="px-5 pb-6 max-h-[75vh] overflow-y-auto">
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
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  {secondaryItems.map((item) => {
                    const active = isActive(item.href);
                    const Icon = ICON_MAP[item.label] || BookOpen;
                    const badge = getBadge(item.label);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 min-h-[80px] touch-manipulation ${
                          active
                            ? "bg-[#7c3aed]/10 border-[#7c3aed]/30 text-cyan-400"
                            : "bg-white/3 border-white/8 text-slate-400 hover:text-white hover:border-white/15"
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
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600/20 text-sm font-bold transition-all touch-manipulation min-h-[52px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* DESKTOP: Collapsible rail sidebar                      */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.aside
        initial={false}
        animate={{ width: isOpen ? FULL_W : RAIL_W }}
        transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-30 overflow-hidden
                   bg-[#0b0d1a]/90 backdrop-blur-2xl
                   border-r border-white/6
                   shadow-[4px_0_24px_rgba(0,0,0,0.4)]
                   justify-between py-4"
        style={{ minWidth: RAIL_W }}
      >
        {/* ── Logo / Brand ── */}
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
          {/* Top: logo + pin toggle */}
          <div className="flex items-center px-3 mb-6 gap-2 min-h-[52px]">
            <Link
              href="/"
              className="flex items-center gap-3 shrink-0 group"
              title="Fusion MDCAT"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 border border-white/10 overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="Fusion College Logo"
                  width={32}
                  height={32}
                  className="object-contain transition-transform duration-300 group-hover:scale-110"
                  priority
                />
              </div>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <div className="text-[13px] font-black tracking-widest text-white uppercase leading-none">
                      FUSION
                    </div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest capitalize leading-none mt-0.5">
                      {user.role} Portal
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>

            {/* Pin toggle — only visible when expanded */}
            <AnimatePresence>
              {isOpen && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  onClick={togglePin}
                  title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
                  className="ml-auto shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-all"
                >
                  {pinned ? (
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  ) : (
                    <PanelLeftOpen className="w-3.5 h-3.5" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* ── Nav Items ── */}
          <div className="space-y-0.5 px-2">
            {allItems.map((item) => {
              const active = isActive(item.href);
              const Icon = ICON_MAP[item.label] || BookOpen;
              const badge = getBadge(item.label);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!isOpen ? item.label : undefined}
                  className={`relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group min-h-[44px] touch-manipulation overflow-hidden ${
                    active ? "text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {/* Active background */}
                  {active && (
                    <motion.div
                      layoutId="active-pill-desktop"
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/12 to-purple-500/12 rounded-xl border border-cyan-500/20"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {/* Hover background */}
                  {!active && (
                    <div className="absolute inset-0 bg-white/0 rounded-xl transition-all duration-150 group-hover:bg-white/5" />
                  )}

                  {/* Icon container */}
                  <div
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150 ${
                      active
                        ? "bg-cyan-500/18 text-cyan-400"
                        : "text-slate-400 group-hover:text-cyan-300 group-hover:bg-white/6"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {/* Badge on icon when collapsed */}
                    {!isOpen && badge ? (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[7px] font-bold text-white">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : null}
                  </div>

                  {/* Label + badge when expanded */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className="relative z-10 flex flex-1 items-center gap-2 overflow-hidden whitespace-nowrap"
                      >
                        <span className="flex-1">{item.label}</span>
                        {badge ? (
                          <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500/20 border border-rose-500/30 px-1 text-[9px] font-bold text-rose-400">
                            {badge}
                          </span>
                        ) : null}
                        {active && (
                          <ChevronRight className="w-3 h-3 text-cyan-400/50 shrink-0" />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Sign Out (always visible) ── */}
        <div className="shrink-0 px-2 pt-3 border-t border-white/5">
          <button
            onClick={handleLogout}
            title={!isOpen ? "Sign Out" : undefined}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all group min-h-[44px] touch-manipulation overflow-hidden border border-transparent hover:border-rose-500/20"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 group-hover:bg-rose-500/15 transition-all">
              <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  className="whitespace-nowrap"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  );
}

/* ────────────────────────────────────────────────────────── */
/* AuthGuard                                                   */
/* ────────────────────────────────────────────────────────── */
export function AuthGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
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
