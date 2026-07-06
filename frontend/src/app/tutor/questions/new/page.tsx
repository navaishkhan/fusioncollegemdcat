"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";

const SUBJECTS = ["bio", "chem", "physics", "english", "logical_reasoning"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export default function CreateQuestionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    subject: "bio",
    topic: "",
    difficulty: "medium",
    past_paper_year: "",
    stem: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A",
    explanation: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/questions", {
        method: "POST",
        body: JSON.stringify({
          subject: form.subject,
          topic: form.topic,
          difficulty: form.difficulty,
          past_paper_year: form.past_paper_year ? parseInt(form.past_paper_year) : null,
          stem: form.stem,
          options: {
            A: form.option_a,
            B: form.option_b,
            C: form.option_c,
            D: form.option_d,
          },
          correct_option: form.correct_option,
          explanation: form.explanation || null,
        }),
      });
      router.push("/tutor/questions");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="New Question">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400">Subject</label>
              <select
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => update("difficulty", e.target.value)}
                className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Topic</label>
            <input
              value={form.topic}
              onChange={(e) => update("topic", e.target.value)}
              placeholder="e.g. Cell Structure, Organic Chemistry"
              className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">
              Past Paper Year <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              value={form.past_paper_year}
              onChange={(e) => update("past_paper_year", e.target.value)}
              placeholder="e.g. 2024"
              type="number"
              className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Question (stem)</label>
            <textarea
              value={form.stem}
              onChange={(e) => update("stem", e.target.value)}
              rows={3}
              placeholder="Type the question here..."
              className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-400">Options</label>
            {(["A", "B", "C", "D"] as const).map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#2b3052] text-xs font-bold text-zinc-400">
                  {opt}
                </span>
                <input
                  value={form[`option_${opt.toLowerCase()}` as keyof typeof form] as string}
                  onChange={(e) => update(`option_${opt.toLowerCase()}`, e.target.value)}
                  placeholder={`Option ${opt}`}
                  className="flex-1 rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Correct Option</label>
            <div className="flex gap-2">
              {(["A", "B", "C", "D"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => update("correct_option", opt)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                    form.correct_option === opt
                      ? "bg-emerald-600 text-white"
                      : "border border-[#2b3052] bg-[#0a0c14] text-zinc-400"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">
              Explanation <span className="text-zinc-500">(optional)</span>
            </label>
            <textarea
              value={form.explanation}
              onChange={(e) => update("explanation", e.target.value)}
              rows={2}
              placeholder="Explain the correct answer..."
              className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Question"}
          </button>
        </form>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
