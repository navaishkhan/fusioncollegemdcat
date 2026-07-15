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
} from "lucide-react";
import { dashboardPath, getStoredUser, clearAuth, apiFetch } from "@/lib/api";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home: Home,
  Users: Users,
  Bank: BookOpen,
  Tests:   FileText,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>({ role: "student" });
  const [pathname, setPathname] = useState("");
  const [stats, setStats] = useState<{ pending_question_reviews?: number; pending_manual_grading?: number } | null>(null);

  useEffect(() => {
    setPathname(window.location.pathname);
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
  const secondaryItems = SECONDARY_NAV[user.role] || [];

  // Don't show nav on exam pages
  if (pathname.includes("/student/tests/") && pathname !== "/student/tests") return null;

  const allItems = NAV[user.role] || [];
  const primaryItems = PRIMARY_NAV[user.role] || [];

  const handleLogout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Mobile Floating Bottom Nav */}
      <nav className="fixed bottom-4 left-4 right-4 z-35 md:hidden glass-panel border border-[#1e223c]/85 rounded-2xl shadow-2xl p-2 safe-bottom">
        <div className="flex items-center justify-around gap-1">
          {primaryItems.map((item) => {
            const active = pathname === item.href;
            const Icon = ICON_MAP[item.label] || BookOpen;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center flex-1 py-2 text-[10px] font-bold rounded-xl transition-all duration-300 ${
                  active ? "text-cyan-400" : "text-slate-400 hover:text-white"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-pill-mobile"
                    className="absolute inset-0 bg-[#7c3aed]/15 rounded-xl border border-[#7c3aed]/20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <Icon className={`w-5 h-5 mb-1 relative z-10 ${active ? "text-cyan-400" : "text-slate-400"}`} />
                  {item.label === "Reviews" && stats?.pending_question_reviews ? (
                    <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white ring-2 ring-[#0c0e1a]">
                      {stats.pending_question_reviews}
                    </span>
                  ) : null}
                  {item.label === "Grading" && stats?.pending_manual_grading ? (
                    <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-[#0c0e1a]">
                      {stats.pending_manual_grading}
                    </span>
                  ) : null}
                </div>
                <span className="relative z-10 text-[9px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}
          
          {/* Menu Button */}
          {secondaryItems.length > 0 && (
            <button
              onClick={() => setMenuOpen(true)}
              className="relative flex flex-col items-center justify-center flex-1 py-2 text-[10px] font-bold rounded-xl text-slate-400 hover:text-white transition-all duration-300"
            >
              <Menu className="w-5 h-5 mb-1" />
              <span className="text-[9px] tracking-tight">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* Sliding Mobile Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0c0e1a]/95 backdrop-blur-2xl border-t border-[#1e223c] rounded-t-3xl p-6 shadow-2xl safe-bottom max-h-[70vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fusion MDCAT</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{user.role} Menu</p>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 rounded-full bg-[#16192b] text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {secondaryItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = ICON_MAP[item.label] || BookOpen;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 ${
                        active 
                          ? "bg-[#7c3aed]/10 border-[#7c3aed]/30 text-cyan-400" 
                          : "bg-[#16192b]/55 border-[#1e223c] text-slate-400 hover:text-white hover:border-[#2b3052]"
                      }`}
                    >
                      <Icon className="w-6 h-6 mb-2" />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600/20 hover:border-rose-500/30 text-xs font-bold transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-4 top-4 bottom-4 w-64 rounded-3xl glass-panel glossy-border bg-[rgba(12,14,26,0.6)] backdrop-blur-3xl shadow-2xl py-6 px-4 z-30 justify-between overflow-y-auto scrollbar-none">
        <div className="space-y-6">
          <Link href="/" className="px-3 py-2 flex items-center gap-3 hover:opacity-85 transition-opacity group">
            <Image
              src="/logo.png"
              alt="Fusion College Logo"
              width={40}
              height={40}
              className="rounded-full border border-[#1e223c] bg-white object-contain shadow-md transition-transform duration-300 group-hover:rotate-12"
              priority
            />
            <div>
              <h2 className="text-sm font-black tracking-widest text-white uppercase">FUSION MDCAT</h2>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                {user.role} Portal
              </div>
            </div>
          </Link>
          
          <div className="space-y-1.5">
            {allItems.map((item) => {
              const active = pathname === item.href;
              const Icon = ICON_MAP[item.label] || BookOpen;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 group ${
                    active ? "text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="active-pill-desktop"
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {/* Subtle animation indicator for inactive links on hover */}
                  {!active && (
                    <div className="absolute inset-0 bg-white/0 rounded-2xl transition-all duration-300 group-hover:bg-white/5" />
                  )}
                  <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${active ? 'bg-cyan-500/20 text-cyan-400 shadow-inner' : 'bg-[#16192b] text-slate-400 group-hover:bg-[#1e223c] group-hover:text-cyan-300'}`}>
                    <Icon className={`w-4 h-4 ${active ? "animate-pulse" : ""}`} />
                  </div>
                  <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5 flex-1">{item.label}</span>
                  {item.label === "Reviews" && stats?.pending_question_reviews ? (
                    <span className="relative z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/30 px-1.5 text-[10px] font-bold text-amber-400">
                      {stats.pending_question_reviews}
                    </span>
                  ) : null}
                  {item.label === "Grading" && stats?.pending_manual_grading ? (
                    <span className="relative z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500/20 border border-rose-500/30 px-1.5 text-[10px] font-bold text-rose-400">
                      {stats.pending_manual_grading}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors mt-auto cursor-pointer border border-rose-500/10 hover:border-rose-500/30"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
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
