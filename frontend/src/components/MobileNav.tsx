"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardPath, getStoredUser } from "@/lib/api";

const NAV: Record<string, { href: string; label: string }[]> = {
  admin: [
    { href: "/admin", label: "Home" },
    { href: "/admin/users", label: "Users" },
    { href: "/tutor/questions", label: "Bank" },
    { href: "/tutor/tests", label: "Tests" },
    { href: "/tutor/batches", label: "Batches" },
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1e233d] bg-[#0d0f1a]/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[72px] flex-col items-center rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors ${
                active
                  ? "bg-[#3d4193]/40 text-cyan-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
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
