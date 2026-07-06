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
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = () => {
    const params = subject ? `?subject=${subject}` : "";
    apiFetch<Question[]>(`/api/questions${params}`)
      .then(setQuestions)
      .catch((e) => setError(e.message));
  };

  useEffect(fetchQuestions, [subject]);

  const deleteQuestion = async (id: string) => {
    if (!confirm("Deactivate this question?")) return;
    try {
      await apiFetch(`/api/questions/${id}`, { method: "DELETE" });
      fetchQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Question Bank">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSubject("")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${!subject ? "bg-cyan-500/20 text-cyan-400" : "bg-[#16192b] text-zinc-400"}`}>All</button>
          {SUBJECTS.map((s) => (
            <button key={s} onClick={() => setSubject(s)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${subject === s ? "bg-cyan-500/20 text-cyan-400" : "bg-[#16192b] text-zinc-400"}`}>{s.replace("_", " ")}</button>
          ))}
        </div>
        <div className="mb-4 flex gap-2">
          <button onClick={() => router.push("/tutor/questions/new")} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white">+ New</button>
          <button onClick={() => router.push("/tutor/questions/import")} className="flex-1 rounded-xl bg-[#3d4193] py-3 text-sm font-semibold text-white">Import</button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="space-y-3">
          {questions.map((q) => (
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
                  <button onClick={() => router.push(`/tutor/questions/${q.id}/edit`)} className="rounded-lg bg-[#3d4193] px-3 py-1 text-[11px] font-semibold text-white">Edit</button>
                  <button onClick={() => deleteQuestion(q.id)} className="rounded-lg bg-red-600/30 px-3 py-1 text-[11px] font-semibold text-red-300">Del</button>
                </div>
              </div>
            </Card>
          ))}
          {!error && questions.length === 0 && <p className="text-center text-sm text-zinc-500">No questions yet.</p>}
        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
