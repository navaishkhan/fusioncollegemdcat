"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  LogOut,
  Menu,
  X,
  Loader2
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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getStoredUser();
  if (!user) return null;

  const allItems = NAV[user.role] || [];
  const primaryItems = PRIMARY_NAV[user.role] || [];
  const secondaryItems = SECONDARY_NAV[user.role] || [];

  // Don't show nav on exam pages
  if (pathname.includes("/student/tests/") && pathname !== "/student/tests") return null;

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
                <Icon className={`w-5 h-5 mb-1 relative z-10 ${active ? "text-cyan-400" : "text-slate-400"}`} />
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
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 border-r border-[#1e223c] bg-[#0c0e1a]/95 backdrop-blur-xl py-6 px-4 z-30 justify-between">
        <div className="space-y-6">
          <div className="px-3 py-2">
            <h2 className="text-gradient text-lg font-black tracking-wider uppercase">FUSION MDCAT</h2>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              {user.role} Portal
            </div>
          </div>
          
          <div className="space-y-1.5">
            {allItems.map((item) => {
              const active = pathname === item.href;
              const Icon = ICON_MAP[item.label] || BookOpen;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group ${
                    active ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="active-pill-desktop"
                      className="absolute inset-0 bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/25 shadow-lg shadow-[#7c3aed]/5"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {/* Subtle animation indicator for inactive links on hover */}
                  {!active && (
                    <div className="absolute inset-0 bg-white/0 rounded-xl transition-all duration-300 group-hover:bg-white/5" />
                  )}
                  <Icon className={`w-5 h-5 relative z-10 transition-colors duration-300 ${active ? "text-cyan-400 animate-pulse" : "text-slate-400 group-hover:text-cyan-300"}`} />
                  <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors mt-auto cursor-pointer border border-transparent hover:border-rose-500/10"
        >
          <LogOut className="w-5 h-5 animate-pulse" />
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
