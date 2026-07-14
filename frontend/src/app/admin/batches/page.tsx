"use client";

import { useEffect, useState } from "react";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";
import { Plus, Users, X, Loader2, ChevronRight, CheckCircle2 } from "lucide-react";
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
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#3d4193] px-4 py-2 text-sm font-semibold text-white hover:bg-[#252a4a] transition-colors"
                >
                  <Plus className="h-4 w-4" /> Create Batch
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                </div>
              ) : batches.length === 0 ? (
                <div className="rounded-2xl border border-[#2b3052] bg-[#0a0c14] p-8 text-center text-zinc-500">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>No batches exist yet.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {batches.map((b) => (
                    <Card key={b.id} onClick={() => openBatchDetails(b)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-white">{b.name}</h3>
                          {b.description && (
                            <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{b.description}</p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-zinc-500" />
                      </div>
                    </Card>
                  ))}
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

              <div className="mb-6 rounded-2xl border border-[#2b3052] bg-[#0a0c14] p-5">
                <h3 className="mb-3 text-sm font-bold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-500" /> Add Student to Batch
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={studentToEnroll}
                    onChange={(e) => setStudentToEnroll(e.target.value)}
                    className="flex-1 rounded-xl border border-[#2b3052] bg-[#16192b] px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
                  >
                    <option value="">Select a student...</option>
                    {allStudents
                      .filter((s) => !enrolledStudents.some((es) => es.id === s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.email})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling || !studentToEnroll}
                    className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
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
                <div className="rounded-2xl border border-[#2b3052] bg-[#0a0c14] p-8 text-center text-zinc-500 text-sm">
                  No students enrolled in this batch yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {enrolledStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-xl border border-[#1e233d] bg-[#0d0e1a] p-3"
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
          <div className="w-full max-w-md rounded-3xl border border-[#1e2340] bg-[#0d0f1e] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-cyan-400" /> Create New Batch
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white">
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
                  className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">Description (Optional)</label>
                <textarea
                  value={batchDesc}
                  onChange={(e) => setBatchDesc(e.target.value)}
                  placeholder="Additional details..."
                  rows={3}
                  className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
                />
              </div>
              
              <button
                onClick={handleCreateBatch}
                disabled={creating || !batchName}
                className="w-full rounded-xl bg-gradient-to-r from-[#3d4193] to-cyan-700 py-3 mt-2 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Batch"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <MobileNav />
    </AuthGuard>
  );
}
