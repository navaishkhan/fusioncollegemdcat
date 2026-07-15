"use client";

import { useEffect, useState } from "react";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";
import { Plus, Users, X, Loader2, ChevronRight, CheckCircle2, Trash2, CheckSquare, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Batch {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface UserItem {
  id: string;
  full_name: string;
  email: string;
}

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // All students for dropdown
  const [allStudents, setAllStudents] = useState<UserItem[]>([]);

  // Modals / Details
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [batchDesc, setBatchDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<UserItem[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [studentToEnroll, setStudentToEnroll] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  // Bulk select
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const fetchBatches = async () => {
    try {
      const data = await apiFetch<Batch[]>("/api/batches");
      setBatches(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load batches");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await apiFetch<UserItem[]>("/api/admin/users?role=student");
      setAllStudents(data);
    } catch {}
  };

  useEffect(() => {
    fetchBatches();
    fetchStudents();
  }, []);

  const handleCreateBatch = async () => {
    if (!batchName) return;
    setCreating(true);
    setError(null);
    try {
      await apiFetch("/api/batches", {
        method: "POST",
        body: JSON.stringify({ name: batchName, description: batchDesc }),
      });
      setMsg(`Batch '${batchName}' created`);
      setShowCreateModal(false);
      setBatchName("");
      setBatchDesc("");
      fetchBatches();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create batch");
    } finally {
      setCreating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === batches.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(batches.map((b) => b.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setConfirmBulk(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    setError(null);
    try {
      await Promise.all(
        [...selectedIds].map((id) => apiFetch(`/api/batches/${id}`, { method: "DELETE" }))
      );
      setMsg(`Deleted ${selectedIds.size} batch${selectedIds.size > 1 ? "es" : ""}`);
      setBatches((prev) => prev.filter((b) => !selectedIds.has(b.id)));
      exitSelectMode();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
      setConfirmBulk(false);
    }
  };

  const openBatchDetails = async (batch: Batch) => {
    setSelectedBatch(batch);
    setEnrolledStudents([]);
    setLoadingEnrollments(true);
    setStudentToEnroll("");
    try {
      const data = await apiFetch<UserItem[]>(`/api/batches/${batch.id}/students`);
      setEnrolledStudents(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load students");
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedBatch || !studentToEnroll) return;
    setEnrolling(true);
    setError(null);
    try {
      const added = await apiFetch<UserItem>(`/api/batches/${selectedBatch.id}/enroll`, {
        method: "POST",
        body: JSON.stringify({ student_id: studentToEnroll }),
      });
      setMsg(`Student enrolled successfully!`);
      setEnrolledStudents((prev) => [...prev, added]);
      setStudentToEnroll("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enroll student");
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <AuthGuard roles={["admin"]}>
      <PageShell title={selectedBatch ? `Batch: ${selectedBatch.name}` : "Manage Batches"}>
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        {msg && (
          <p className="mb-4 text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> {msg}
          </p>
        )}

        <AnimatePresence mode="wait">
          {!selectedBatch ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Batch List Toolbar */}
              <div className="mb-4 flex items-center gap-2">
                {!selectMode ? (
                  <>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-sm font-semibold text-white cursor-pointer magnetic-btn shadow-lg shadow-emerald-950/20"
                    >
                      <Plus className="h-4 w-4" /> Create Batch
                    </button>
                    {batches.length > 0 && (
                      <button
                        onClick={() => setSelectMode(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <CheckSquare className="h-4 w-4" /> Select
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={toggleAll}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {selectedIds.size === batches.length ? <CheckSquare className="h-4 w-4 text-cyan-400" /> : <Square className="h-4 w-4" />}
                      {selectedIds.size === batches.length ? "Deselect All" : "Select All"}
                    </button>
                    <span className="text-xs text-zinc-500 flex-1 text-center">{selectedIds.size} selected</span>
                    {selectedIds.size > 0 && (
                      <button
                        onClick={() => setConfirmBulk(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-red-600/20 border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-600/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    )}
                    <button onClick={exitSelectMode} className="rounded-xl border border-white/10 p-2 text-zinc-400 hover:text-white cursor-pointer">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                </div>
              ) : batches.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center text-zinc-500 glossy-border">
                  <Users className="mx-auto mb-2 h-8 w-8 text-cyan-500 opacity-60 animate-bounce" />
                  <p className="text-sm font-semibold">No batches exist yet.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {batches.map((b) => {
                    const isSelected = selectedIds.has(b.id);
                    return (
                      <Card
                        key={b.id}
                        onClick={selectMode ? () => toggleSelect(b.id) : () => openBatchDetails(b)}
                        className={selectMode && isSelected ? "border-cyan-500/50 bg-cyan-500/5" : ""}
                      >
                        <div className="flex items-center justify-between">
                          {selectMode && (
                            <div className="shrink-0 mr-3">
                              {isSelected ? <CheckSquare className="h-5 w-5 text-cyan-400" /> : <Square className="h-5 w-5 text-zinc-600" />}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white">{b.name}</h3>
                            {b.description && (
                              <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{b.description}</p>
                            )}
                          </div>
                          {!selectMode && <ChevronRight className="h-5 w-5 text-zinc-500" />}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <button
                onClick={() => setSelectedBatch(null)}
                className="mb-4 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                ← Back to Batches
              </button>

              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 glossy-border">
                <h3 className="mb-3 text-sm font-bold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-400" /> Add Student to Batch
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={studentToEnroll}
                    onChange={(e) => setStudentToEnroll(e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all"
                  >
                    <option value="" className="bg-[#0c0e1a]">Select a student...</option>
                    {allStudents
                      .filter((s) => !enrolledStudents.some((es) => es.id === s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#0c0e1a]">
                          {s.full_name} ({s.email})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling || !studentToEnroll}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-2 text-sm font-bold text-white disabled:opacity-50 cursor-pointer magnetic-btn"
                  >
                    {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enroll"}
                  </button>
                </div>
              </div>

              <h3 className="mb-3 text-sm font-bold text-zinc-400 uppercase tracking-wider">
                Enrolled Students ({enrolledStudents.length})
              </h3>

              {loadingEnrollments ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                </div>
              ) : enrolledStudents.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/3 p-8 text-center text-zinc-500 text-sm">
                  No students enrolled in this batch yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {enrolledStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/3 p-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">{student.full_name}</div>
                        <div className="text-xs text-zinc-500">{student.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </PageShell>

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl glossy-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-cyan-400" /> Create New Batch
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">Batch Name</label>
                <input
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g. Morning 2026"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/40 focus:bg-white/8 transition-all"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">Description (Optional)</label>
                <textarea
                  value={batchDesc}
                  onChange={(e) => setBatchDesc(e.target.value)}
                  placeholder="Additional details..."
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/40 focus:bg-white/8 transition-all"
                />
              </div>
              
              <button
                onClick={handleCreateBatch}
                disabled={creating || !batchName}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 py-3 mt-2 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer magnetic-btn shadow-lg shadow-cyan-950/20"
              >
                {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <h2 className="text-sm font-bold text-white">Delete {selectedIds.size} Batch{selectedIds.size > 1 ? "es" : ""}</h2>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">This action is irreversible</p>
                </div>
              </div>
              <p className="mb-6 text-sm text-zinc-300 leading-relaxed">
                Are you sure you want to permanently delete these batches? All students enrolled will be removed from the batch.
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
                  {bulkDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : "Delete All"}
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
