"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  LogOut
} from "lucide-react";
import { dashboardPath, getStoredUser, clearAuth } from "@/lib/api";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home: Home,
  Users: Users,
  Bank: BookOpen,
  Tests: FileText,
  Batches: Layers,
  Analytics: BarChart3,
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

export default function MobileNav() {
  const pathname = usePathname();
  const user = getStoredUser();
  if (!user) return null;

  const items = NAV[user.role] || [];

  // Don't show nav on exam pages
  if (pathname.includes("/student/tests/") && pathname !== "/student/tests") return null;

  const handleLogout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Mobile Floating Bottom Nav */}
      <nav className="fixed bottom-4 left-4 right-4 z-35 md:hidden glass-panel border border-[#1e223c]/80 rounded-2xl shadow-2xl p-1.5 safe-bottom">
        <div className="flex items-center justify-around gap-1">
          {items.map((item) => {
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
                <Icon className={`w-5 h-5 mb-1 relative z-10 ${active ? "text-cyan-400" : "text-slate-400"}`} />
                <span className="relative z-10 text-[9px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 border-r border-[#1e223c] bg-[#0c0e1a]/95 backdrop-blur-xl py-6 px-4 z-30 justify-between">
        <div className="space-y-6">
          <div className="px-3 py-2">
            <h2 className="text-gradient text-lg font-black tracking-wider uppercase">FUSION MDCAT</h2>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              {user.role} Portal
            </div>
          </div>
          
          <div className="space-y-1">
            {items.map((item) => {
              const active = pathname === item.href;
              const Icon = ICON_MAP[item.label] || BookOpen;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    active ? "text-cyan-400" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="active-pill-desktop"
                      className="absolute inset-0 bg-[#7c3aed]/15 rounded-xl border border-[#7c3aed]/30"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-5 h-5 relative z-10 ${active ? "text-cyan-400" : "text-slate-400"}`} />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors mt-auto cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </aside>
    </>
  );
}

export function AuthGuard({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const user = getStoredUser();
  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    if (typeof window !== "undefined") window.location.href = dashboardPath(user.role);
    return null;
  }
  return <>{children}</>;
}

