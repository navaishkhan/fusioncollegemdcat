"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText, Trash2, Loader2, CheckSquare, Square, X } from "lucide-react";

interface TestItem {
  id: string;
  title: string;
  duration_minutes: number;
  question_count: number;
  negative_marking: number;
  marking_mode: "auto" | "manual";
}

export default function TutorTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Bulk select
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const fetchTests = () => {
    setLoading(true);
    apiFetch<TestItem[]>("/api/tests")
      .then(setTests)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === tests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tests.map((t) => t.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
    setConfirmBulk(false);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    setError(null);
    try {
      await Promise.all(
        [...selected].map((id) => apiFetch(`/api/tests/${id}`, { method: "DELETE" }))
      );
      setMsg(`Deleted ${selected.size} test${selected.size > 1 ? "s" : ""}`);
      setTests((prev) => prev.filter((t) => !selected.has(t.id)));
      exitSelectMode();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
      setConfirmBulk(false);
    }
  };

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Tests">
        {/* Toolbar */}
        <div className="mb-4 flex items-center gap-2">
          {!selectMode ? (
            <>
              <button
                onClick={() => router.push("/tutor/tests/new")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-colors magnetic-btn cursor-pointer shadow-lg shadow-emerald-950/20"
              >
                <Plus className="h-4 w-4" /> New Test
              </button>
              {tests.length > 0 && (
                <button
                  onClick={() => setSelectMode(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <CheckSquare className="h-4 w-4" /> Select
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                {selected.size === tests.length ? <CheckSquare className="h-4 w-4 text-cyan-400" /> : <Square className="h-4 w-4" />}
                {selected.size === tests.length ? "Deselect All" : "Select All"}
              </button>
              <span className="text-xs text-zinc-500 flex-1 text-center">{selected.size} selected</span>
              {selected.size > 0 && (
                <button
                  onClick={() => setConfirmBulk(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600/20 border border-red-500/30 px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-600/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
              <button onClick={exitSelectMode} className="rounded-xl border border-white/10 p-2.5 text-zinc-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {msg && (
          <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-3 text-xs text-emerald-400 flex items-center gap-1.5">
            {msg}
          </motion.p>
        )}
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {loading ? (
          <div className="flex justify-center p-8">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {tests.map((t) => {
                const isSelected = selected.has(t.id);
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      onClick={selectMode ? () => toggleSelect(t.id) : undefined}
                      className={selectMode && isSelected ? "border-cyan-500/50 bg-cyan-500/5" : ""}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {selectMode && (
                          <div className="shrink-0 mt-0.5">
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-cyan-400" />
                            ) : (
                              <Square className="h-5 w-5 text-zinc-600" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
                            <h3 className="font-bold text-white">{t.title}</h3>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                            <span>{t.question_count} questions</span>
                            <span>{t.duration_minutes} min</span>
                            <span>−{Math.abs(t.negative_marking)} wrong</span>
                            <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase tracking-wider ${
                              t.marking_mode === "manual" 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            }`}>
                              {t.marking_mode} Marking
                            </span>
                          </div>
                        </div>
                        {!selectMode && (
                          <button
                            onClick={() => router.push(`/tutor/tests/${t.id}/assign`)}
                            className="shrink-0 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-400 hover:text-white transition-all cursor-pointer"
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {tests.length === 0 && (
              <p className="text-center text-sm text-zinc-500 py-8">No tests created yet.</p>
            )}
          </div>
        )}
      </PageShell>

      {/* Bulk Delete Confirm Modal */}
      <AnimatePresence>
        {confirmBulk && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl border border-red-500/30 bg-white/5 backdrop-blur-xl p-6 shadow-2xl glossy-border"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Delete {selected.size} Test{selected.size > 1 ? "s" : ""}</h2>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">This cannot be undone</p>
                </div>
              </div>
              <p className="mb-6 text-sm text-zinc-300 leading-relaxed">
                Are you sure you want to permanently delete {selected.size} selected test{selected.size > 1 ? "s" : ""}? All associated assignments and attempts may be affected.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmBulk(false)}
                  disabled={bulkDeleting}
                  className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white flex items-center justify-center gap-2 hover:bg-red-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {bulkDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileNav />
    </AuthGuard>
  );
}
