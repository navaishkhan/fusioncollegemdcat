"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, CheckSquare, Square, X, Loader2 } from "lucide-react";

interface Question {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  stem: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_option: string;
  explanation?: string;
}

const SUBJECTS = ["bio", "chem", "physics", "english", "logical_reasoning"];

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedSubTopic, setSelectedSubTopic] = useState<string>("");
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Bulk select
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);

  // Single delete modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchQuestions = () => {
    let url = `/api/questions`;
    const queryParts = [];
    if (subject) queryParts.push(`subject=${subject}`);
    if (debouncedSearch) queryParts.push(`q=${encodeURIComponent(debouncedSearch)}`);
    if (queryParts.length > 0) {
      url += `?${queryParts.join("&")}`;
    }
    
    apiFetch<Question[]>(url)
      .then(setQuestions)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    fetchQuestions();
    setActiveTab("all");
    setSelectedSubTopic("");
  }, [subject, debouncedSearch]);

  // Reset sub-topic when tab changes
  useEffect(() => {
    setSelectedSubTopic("");
  }, [activeTab]);

  const deleteQuestion = async () => {
    if (!deleteConfirmId) return;
    setDeletingId(deleteConfirmId);
    try {
      await apiFetch(`/api/questions/${deleteConfirmId}`, { method: "DELETE" });
      fetchQuestions();
      setDeleteConfirmId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelectQ = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllQ = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
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
        [...selectedIds].map((id) => apiFetch(`/api/questions/${id}`, { method: "DELETE" }))
      );
      setMsg(`Deleted ${selectedIds.size} question${selectedIds.size > 1 ? "s" : ""}`);
      fetchQuestions();
      exitSelectMode();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
      setConfirmBulk(false);
    }
  };

  // Grouped counts mapping
  const mostRepeatedCount = questions.filter((q) => q.topic === "Most Repeated").length;
  const pastPapersCount = questions.filter((q) => q.topic.startsWith("Past Paper - ")).length;
  const chapterWiseCount = questions.filter(
    (q) => q.topic && q.topic !== "Most Repeated" && !q.topic.startsWith("Past Paper - ")
  ).length;

  // Filter questions for the active tab
  const tabQuestions = questions.filter((q) => {
    if (activeTab === "most_repeated") return q.topic === "Most Repeated";
    if (activeTab === "past_papers") return q.topic.startsWith("Past Paper - ");
    if (activeTab === "chapter_wise")
      return q.topic && q.topic !== "Most Repeated" && !q.topic.startsWith("Past Paper - ");
    return true; // "all"
  });

  // Calculate unique sub-topics (chapters/years) in current tab
  const subTopics = Array.from(new Set(tabQuestions.map((q) => q.topic)))
    .filter(Boolean)
    .sort();

  // Filter questions by sub-topic client-side
  const filteredQuestions = selectedSubTopic
    ? tabQuestions.filter((q) => q.topic === selectedSubTopic)
    : tabQuestions;

  // Build tabs dynamically depending on data availability
  const tabs = [
    { id: "all", label: "All", count: questions.length },
    ...(mostRepeatedCount > 0 ? [{ id: "most_repeated", label: "Most Repeated", count: mostRepeatedCount }] : []),
    ...(chapterWiseCount > 0 ? [{ id: "chapter_wise", label: "Chapter-Wise", count: chapterWiseCount }] : []),
    ...(pastPapersCount > 0 ? [{ id: "past_papers", label: "Past Papers", count: pastPapersCount }] : [])
  ];

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Question Bank">
        {/* Subject Navigation */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setSubject("")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${!subject ? "bg-cyan-500/20 text-cyan-400" : "bg-[#16192b] text-zinc-400"}`}>All Subjects</button>
          {SUBJECTS.map((s) => (
            <button key={s} onClick={() => setSubject(s)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${subject === s ? "bg-cyan-500/20 text-cyan-400" : "bg-[#16192b] text-zinc-400"}`}>{s.replace("_", " ")}</button>
          ))}
        </div>

        {/* Search Input */}
        <div className="mb-4 relative flex items-center">
          <input
            type="text"
            placeholder="Search MCQs by statement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-[#121424] border border-[#1e223c] px-4 py-3 pl-10 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
          />
          <svg
            className="absolute left-3.5 h-4 w-4 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 text-zinc-500 hover:text-white transition-colors text-xs"
            >
              x
            </button>
          )}
        </div>

        {/* Category Group Tabs */}
        {tabs.length > 1 && (
          <div className="mb-4 rounded-xl bg-[#121424] border border-[#1e223c] p-1 flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-lg py-2 text-center text-[11px] font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
                <span className="ml-1 text-[9px] opacity-60">({tab.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Sub-topic Pills (Chapter-wise or Past Papers) */}
        {subTopics.length > 1 && (activeTab === "chapter_wise" || activeTab === "past_papers") && (
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedSubTopic("")}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold border transition-all ${
                !selectedSubTopic
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                  : "bg-[#16192b] text-zinc-400 border-[#23274a]"
              }`}
            >
              All {activeTab === "chapter_wise" ? "Chapters" : "Years"}
            </button>
            {subTopics.map((topic) => {
              const count = tabQuestions.filter((q) => q.topic === topic).length;
              return (
                <button
                  key={topic}
                  onClick={() => setSelectedSubTopic(topic)}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold border transition-all capitalize ${
                    selectedSubTopic === topic
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                      : "bg-[#16192b] text-zinc-400 border-[#23274a]"
                  }`}
                >
                  {topic.replace("Past Paper - ", "").replace("_", " ")}
                  <span className="ml-1 opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {msg && (
          <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-3 text-xs text-emerald-400">
            {msg}
          </motion.p>
        )}

        {/* Action Bar */}
        <div className="mb-4 flex items-center gap-2">
          {!selectMode ? (
            <>
              <button onClick={() => router.push("/tutor/questions/new")} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-colors">+ New</button>
              <button onClick={() => router.push("/tutor/questions/import")} className="rounded-xl bg-[#3d4193] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4d52b3] transition-colors">Import</button>
              {filteredQuestions.length > 0 && (
                <button
                  onClick={() => setSelectMode(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-[#2b3052] bg-[#16192b] px-3 py-3 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  <CheckSquare className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={toggleAllQ}
                className="flex items-center gap-1.5 rounded-xl border border-[#2b3052] bg-[#16192b] px-3 py-2.5 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
              >
                {selectedIds.size === filteredQuestions.length ? <CheckSquare className="h-4 w-4 text-cyan-400" /> : <Square className="h-4 w-4" />}
                {selectedIds.size === filteredQuestions.length ? "All" : "Select All"}
              </button>
              <span className="text-xs text-zinc-500 flex-1 text-center">{selectedIds.size} selected</span>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setConfirmBulk(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600/20 border border-red-500/30 px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-600/30 transition-colors"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
              <button onClick={exitSelectMode} className="rounded-xl border border-[#2b3052] p-2.5 text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="space-y-3" style={{ perspective: 1000 }}>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
            className="space-y-3"
          >
            <AnimatePresence>
            {filteredQuestions.map((q) => {
              const isFlipped = flippedId === q.id;
              const isSelected = selectedIds.has(q.id);
              return (
                <motion.div
                  key={q.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="relative cursor-pointer"
                  style={{ transformStyle: "preserve-3d" }}
                  onClick={() => selectMode ? toggleSelectQ(q.id) : setFlippedId(isFlipped ? null : q.id)}
                >
                  <motion.div
                    animate={{ rotateX: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 260, damping: 20 }}
                    style={{ transformStyle: "preserve-3d", transformOrigin: "center" }}
                    className="w-full h-full"
                  >
                    {/* Front */}
                    <div
                      style={{ backfaceVisibility: "hidden" }}
                      className="w-full"
                    >
                      <Card className={selectMode && isSelected ? "border-cyan-500/50 bg-cyan-500/5" : ""}>
                        <div className="flex items-start justify-between gap-2">
                          {selectMode && (
                            <div className="shrink-0 mt-0.5">
                              {isSelected ? <CheckSquare className="h-5 w-5 text-cyan-400" /> : <Square className="h-5 w-5 text-zinc-600" />}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-300">{q.subject}</span>
                              <span className="rounded-full bg-[#0a0c14] px-2 py-0.5 text-[10px] text-zinc-400">{q.difficulty}</span>
                            </div>
                            <p className="text-sm text-zinc-200 line-clamp-3">{q.stem}</p>
                            <p className="mt-1 text-xs text-zinc-500">{q.topic}</p>
                            {!selectMode && <p className="mt-2 text-[10px] text-cyan-500 font-bold opacity-60">Tap to view answer</p>}
                          </div>
                          {!selectMode && (
                            <div className="flex shrink-0 flex-col gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => router.push(`/tutor/questions/edit?id=${q.id}`)} className="rounded-lg bg-[#3d4193] px-3 py-1 text-[11px] font-semibold text-white">Edit</button>
                              <button onClick={() => setDeleteConfirmId(q.id)} className="rounded-lg bg-red-600/30 px-3 py-1 text-[11px] font-semibold text-red-300">Del</button>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                    
                    {/* Back */}
                    <div
                      style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)", position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                      className="w-full h-full"
                    >
                      <Card className="h-full border-cyan-500/30 bg-[#0d101d]">
                        <div className="flex flex-col h-full justify-center">
                          <p className="text-xs text-zinc-400 mb-1">Correct Answer:</p>
                          <p className="text-sm font-bold text-emerald-400">{q.options[q.correct_option as keyof typeof q.options]}</p>
                          {q.explanation && (
                            <div className="mt-2 pt-2 border-t border-[#1e233d]">
                              <p className="text-xs text-zinc-500 line-clamp-2">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
          {!error && filteredQuestions.length === 0 && <p className="text-center text-sm text-zinc-500">No questions found.</p>}
        </div>
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
              className="w-full max-w-sm rounded-3xl border border-red-500/30 bg-[#0d0f1e] p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Delete {selectedIds.size} Question{selectedIds.size > 1 ? "s" : ""}</h2>
                  <p className="text-xs text-zinc-500">This cannot be undone</p>
                </div>
              </div>
              <p className="mb-6 text-sm text-zinc-300">
                Permanently delete {selectedIds.size} selected question{selectedIds.size > 1 ? "s" : ""}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmBulk(false)}
                  disabled={bulkDeleting}
                  className="flex-1 rounded-xl border border-[#2b3052] py-3 text-sm font-bold text-white hover:bg-[#16192b] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white flex items-center justify-center gap-2 hover:bg-red-500 disabled:opacity-50 transition-colors"
                >
                  {bulkDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
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
              className="w-full max-w-sm rounded-3xl border border-red-500/30 bg-[#0d0f1e] p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Delete Question</h2>
                  <p className="text-xs text-zinc-500">This cannot be undone</p>
                </div>
              </div>
              <p className="mb-6 text-sm text-zinc-300">
                Are you sure you want to permanently delete this question?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={!!deletingId}
                  className="flex-1 rounded-xl border border-[#2b3052] py-3 text-sm font-bold text-white hover:bg-[#16192b] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteQuestion}
                  disabled={!!deletingId}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white flex items-center justify-center gap-2 hover:bg-red-500 disabled:opacity-50 transition-colors"
                >
                  {deletingId ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
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
