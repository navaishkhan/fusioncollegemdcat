"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { apiFetch } from "@/lib/api";
import {
  Loader2,
  Clock,
  FileText,
  Play,
  Lock,
  ChevronRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Search,
} from "lucide-react";

interface Assignment {
  id: string;
  test_title: string;
  start_at: string;
  end_at: string;
  status: "open" | "upcoming" | "closed";
  attempt_id?: string | null;
}

function StatusBadge({ status }: { status: Assignment["status"] }) {
  const config = {
    open: {
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/25",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
      label: "Open",
    },
    upcoming: {
      bg: "bg-amber-500/15",
      border: "border-amber-500/25",
      text: "text-amber-400",
      dot: "bg-amber-400",
      label: "Upcoming",
    },
    closed: {
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/20",
      text: "text-zinc-400",
      dot: "bg-zinc-500",
      label: "Closed",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${config.bg} ${config.border} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === "open" ? "animate-pulse" : ""}`} />
      {config.label}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function StudentTestsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "upcoming" | "closed">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch<Assignment[]>("/api/tests/my-assignments")
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((a) => {
    const matchesFilter = filter === "all" || a.status === filter;
    const matchesSearch = a.test_title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = {
    all: items.length,
    open: items.filter((i) => i.status === "open").length,
    upcoming: items.filter((i) => i.status === "upcoming").length,
    closed: items.filter((i) => i.status === "closed").length,
  };

  return (
    <AuthGuard roles={["student"]}>
      <div
        className="min-h-screen bg-[#080a14] bg-grid-glow bg-dot-pattern"
      >
        {/* ── Header ── */}
        <header className="sticky top-0 z-20 bg-[#080a14]/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">My Tests</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {counts.open > 0 ? (
                    <span className="text-emerald-400 font-semibold">{counts.open} test{counts.open !== 1 ? "s" : ""} available now</span>
                  ) : (
                    "No open tests at the moment"
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {counts.open > 0 && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-500/30 animate-bounce">
                    {counts.open}
                  </span>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search tests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {(["all", "open", "upcoming", "closed"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all touch-manipulation ${
                    filter === tab
                      ? tab === "open"
                        ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                        : tab === "upcoming"
                        ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                        : tab === "closed"
                        ? "bg-zinc-500/15 border border-zinc-500/25 text-zinc-300"
                        : "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400"
                      : "bg-white/4 border border-white/8 text-slate-400 hover:text-white hover:bg-white/8"
                  }`}
                >
                  <span className="capitalize">{tab === "all" ? "All" : tab}</span>
                  {counts[tab] > 0 && (
                    <span className="bg-white/10 rounded px-1 text-[9px]">{counts[tab]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="px-4 py-5 pb-32 max-w-3xl mx-auto">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/6 bg-white/3 p-5 animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-4 w-40 rounded-lg bg-white/8" />
                    <div className="h-5 w-16 rounded-full bg-white/8" />
                  </div>
                  <div className="h-3 w-56 rounded bg-white/5 mb-3" />
                  <div className="h-10 w-full rounded-xl bg-white/5" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-base font-bold text-slate-300 mb-1">
                {search ? "No matching tests" : filter !== "all" ? `No ${filter} tests` : "No tests assigned yet"}
              </h3>
              <p className="text-sm text-slate-500 max-w-xs">
                {search
                  ? "Try a different search term."
                  : filter !== "all"
                  ? `Switch to 'All' to see other tests.`
                  : "Your tutor hasn't assigned any tests to your batch yet."}
              </p>
              {(search || filter !== "all") && (
                <button
                  onClick={() => { setSearch(""); setFilter("all"); }}
                  className="mt-4 px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 transition-all touch-manipulation"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Test Cards */}
          {!loading && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((a, i) => {
                const opensSoon = a.status === "upcoming" ? timeUntil(a.start_at) : null;
                const closesIn = a.status === "open" ? timeUntil(a.end_at) : null;

                return (
                  <div
                    key={a.id}
                    className={`group relative rounded-2xl border bg-[#0c0e1a]/60 backdrop-blur-sm overflow-hidden transition-all duration-200 ${
                      a.status === "open"
                        ? "border-emerald-500/20 hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-500/8"
                        : a.status === "upcoming"
                        ? "border-amber-500/15 hover:border-amber-500/25"
                        : "border-white/6 opacity-75"
                    }`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {/* Top accent line for open tests */}
                    {a.status === "open" && (
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
                    )}

                    <div className="p-5">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              a.status === "open"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : a.status === "upcoming"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-white/5 text-slate-500"
                            }`}
                          >
                            {a.status === "open" ? (
                              <Play className="w-4 h-4" />
                            ) : a.status === "upcoming" ? (
                              <Clock className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </div>
                          <h3 className="font-bold text-white text-sm leading-snug truncate">{a.test_title}</h3>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>

                      {/* Time info */}
                      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(a.start_at)}
                        </span>
                        <span className="text-slate-700">—</span>
                        <span>{formatDate(a.end_at)}</span>
                      </div>

                      {/* Countdown / action */}
                      {closesIn && (
                        <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15 w-fit">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs font-semibold text-emerald-400">Closes in {closesIn}</span>
                        </div>
                      )}
                      {opensSoon && (
                        <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-xl bg-amber-500/8 border border-amber-500/15 w-fit">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-semibold text-amber-400">Opens in {opensSoon}</span>
                        </div>
                      )}

                      {/* CTA Button */}
                      {a.status === "open" && (
                        <button
                          onClick={() => router.push(`/student/tests/${a.id}`)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 touch-manipulation min-h-[44px]"
                        >
                          <Play className="w-4 h-4" />
                          <span>{a.attempt_id ? "Resume Test" : "Start Test"}</span>
                          <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
                        </button>
                      )}
                      {a.status === "closed" && a.attempt_id && (
                        <button
                          onClick={() => router.push(`/student/results/${a.attempt_id}`)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 text-slate-300 text-sm font-semibold transition-all duration-200 touch-manipulation min-h-[44px]"
                        >
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                          <span>View Results</span>
                          <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <MobileNav />
    </AuthGuard>
  );
}
