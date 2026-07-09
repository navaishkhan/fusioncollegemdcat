"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";

interface Question {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  stem: string;
}

const SUBJECTS = ["bio", "chem", "physics", "english", "logical_reasoning"];

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    setSelectedTopic("");
  }, [subject, debouncedSearch]);

  const deleteQuestion = async (id: string) => {
    if (!confirm("Deactivate this question?")) return;
    try {
      await apiFetch(`/api/questions/${id}`, { method: "DELETE" });
      fetchQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  // Compute unique topics from current questions list
  const uniqueTopics = Array.from(new Set(questions.map((q) => q.topic))).filter(Boolean);

  // Filter questions client-side by selected topic
  const filteredQuestions = selectedTopic
    ? questions.filter((q) => q.topic === selectedTopic)
    : questions;

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Question Bank">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSubject("")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${!subject ? "bg-cyan-500/20 text-cyan-400" : "bg-[#16192b] text-zinc-400"}`}>All</button>
          {SUBJECTS.map((s) => (
            <button key={s} onClick={() => setSubject(s)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${subject === s ? "bg-cyan-500/20 text-cyan-400" : "bg-[#16192b] text-zinc-400"}`}>{s.replace("_", " ")}</button>
          ))}
        </div>

        {/* Search & Topic Filters */}
        <div className="mb-4 flex flex-col gap-3">
          <div className="relative flex items-center">
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
                ✕
              </button>
            )}
          </div>

          {uniqueTopics.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 shrink-0">Topic:</span>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full rounded-xl bg-[#121424] border border-[#1e223c] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/50 transition-all capitalize"
              >
                <option value="">All Topics ({questions.length})</option>
                {uniqueTopics.map((topic) => {
                  const count = questions.filter((q) => q.topic === topic).length;
                  return (
                    <option key={topic} value={topic}>
                      {topic.replace("_", " ")} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        <div className="mb-4 flex gap-2">
          <button onClick={() => router.push("/tutor/questions/new")} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white">+ New</button>
          <button onClick={() => router.push("/tutor/questions/import")} className="flex-1 rounded-xl bg-[#3d4193] py-3 text-sm font-semibold text-white">Import</button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="space-y-3">
          {filteredQuestions.map((q) => (
            <Card key={q.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-300">{q.subject}</span>
                    <span className="rounded-full bg-[#0a0c14] px-2 py-0.5 text-[10px] text-zinc-400">{q.difficulty}</span>
                  </div>
                  <p className="text-sm text-zinc-200 line-clamp-3">{q.stem}</p>
                  <p className="mt-1 text-xs text-zinc-500">{q.topic}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button onClick={() => router.push(`/tutor/questions/edit?id=${q.id}`)} className="rounded-lg bg-[#3d4193] px-3 py-1 text-[11px] font-semibold text-white">Edit</button>
                  <button onClick={() => deleteQuestion(q.id)} className="rounded-lg bg-red-600/30 px-3 py-1 text-[11px] font-semibold text-red-300">Del</button>
                </div>
              </div>
            </Card>
          ))}
          {!error && filteredQuestions.length === 0 && <p className="text-center text-sm text-zinc-500">No questions found.</p>}
        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
