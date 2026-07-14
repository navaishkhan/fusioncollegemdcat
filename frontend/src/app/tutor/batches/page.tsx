"use client";

import { useEffect, useState } from "react";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface Batch {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create batch form
  const [showCreate, setShowCreate] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [batchDesc, setBatchDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Enroll form
  const [enrollingBatch, setEnrollingBatch] = useState<string | null>(null);
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);

  const [allStudents, setAllStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetchBatches();
    fetchStudents();
  }, []);

  const fetchBatches = () => {
    apiFetch<Batch[]>("/api/batches")
      .then(setBatches)
      .catch((e) => setError(e.message));
  };

  const fetchStudents = () => {
    apiFetch<Student[]>("/api/admin/students")
      .then(setAllStudents)
      .catch((e) => console.error("Failed to fetch students:", e));
  };

  const createBatch = async () => {
    if (!batchName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await apiFetch("/api/batches", {
        method: "POST",
        body: JSON.stringify({
          name: batchName,
          description: batchDesc || null,
        }),
      });
      setBatchName("");
      setBatchDesc("");
      setShowCreate(false);
      fetchBatches();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create batch");
    } finally {
      setCreating(false);
    }
  };

  const loadStudents = async (batchId: string) => {
    try {
      const students = await apiFetch<Student[]>(
        `/api/batches/${batchId}/students`,
      );
      setEnrolledStudents(students);
    } catch {
      setEnrolledStudents([]);
    }
  };

  const enrollStudent = async () => {
    if (!enrollingBatch || !enrollStudentId.trim()) return;
    setEnrolling(true);
    setError(null);
    try {
      await apiFetch(`/api/batches/${enrollingBatch}/enroll`, {
        method: "POST",
        body: JSON.stringify({ student_id: enrollStudentId }),
      });
      setEnrollStudentId("");
      loadStudents(enrollingBatch);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to enroll student");
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Batches">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="mb-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
        >
          {showCreate ? "Cancel" : "+ New Batch"}
        </button>

        {showCreate && (
          <div className="mb-4 space-y-3 rounded-xl border border-[#2b3052] bg-[#16192b]/80 p-4">
            <input
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="Batch name (e.g. FSC Pre-Med A)"
              className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
            />
            <input
              value={batchDesc}
              onChange={(e) => setBatchDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
            />
            <button
              onClick={createBatch}
              disabled={creating || !batchName.trim()}
              className="w-full rounded-xl bg-cyan-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        )}

        <motion.div 
          className="space-y-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.05 } }
          }}
        >
          <AnimatePresence>
          {batches.map((b) => (
            <motion.div
              key={b.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white">{b.name}</h3>
                  {b.description && (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {b.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEnrollingBatch(enrollingBatch === b.id ? null : b.id);
                    if (enrollingBatch !== b.id) loadStudents(b.id);
                  }}
                  className="shrink-0 rounded-lg bg-[#3d4193] px-3 py-1 text-xs font-semibold text-white"
                >
                  Enroll
                </button>
              </div>

              {enrollingBatch === b.id && (
                <div className="mt-3 space-y-2 border-t border-[#1e233d] pt-3">
                  <div className="flex gap-2">
                    <select
                      value={enrollStudentId}
                      onChange={(e) => setEnrollStudentId(e.target.value)}
                      className="flex-1 rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2 text-xs text-white"
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
                      onClick={enrollStudent}
                      disabled={enrolling}
                      className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {enrolling ? "..." : "Add"}
                    </button>
                  </div>
                  {enrolledStudents.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-zinc-500">
                        Enrolled ({enrolledStudents.length}):
                      </p>
                      {enrolledStudents.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-lg bg-[#0a0c14] px-3 py-1.5"
                        >
                          <span className="text-xs text-zinc-300">
                            {s.full_name}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {s.email}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>

                )}
              </Card>
            </motion.div>
          ))}
          </AnimatePresence>
          {batches.length === 0 && !error && (
            <p className="py-8 text-center text-sm text-zinc-500">
              No batches yet.
            </p>
          )}
        </motion.div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
