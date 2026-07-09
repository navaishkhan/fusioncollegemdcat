"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";
import MarkdownRenderer from "@/components/MarkdownRenderer";

const SUBJECTS = ["bio", "chem", "physics", "english", "logical_reasoning"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

interface QuestionData {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  past_paper_year: number | null;
  stem: string;
  options: Record<string, string>;
  correct_option: string;
  explanation: string | null;
}

export default function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
    image_url: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    apiFetch<QuestionData & { image_url?: string | null }>(`/api/questions/${id}`)
      .then((q) => {
        setForm({
          subject: q.subject,
          topic: q.topic,
          difficulty: q.difficulty,
          past_paper_year: q.past_paper_year?.toString() || "",
          stem: q.stem,
          option_a: q.options.A || "",
          option_b: q.options.B || "",
          option_c: q.options.C || "",
          option_d: q.options.D || "",
          correct_option: q.correct_option,
          explanation: q.explanation || "",
          image_url: q.image_url || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let finalImageUrl = form.image_url;
      if (imageFile) {
        const { upload } = await import("@vercel/blob/client");
        const blob = await upload(imageFile.name, imageFile, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        finalImageUrl = blob.url;
      }

      await apiFetch(`/api/questions/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          subject: form.subject,
          topic: form.topic,
          difficulty: form.difficulty,
          past_paper_year: form.past_paper_year ? parseInt(form.past_paper_year) : null,
          stem: form.stem,
          image_url: finalImageUrl || null,
          options: { A: form.option_a, B: form.option_b, C: form.option_c, D: form.option_d },
          correct_option: form.correct_option,
          explanation: form.explanation || null,
        }),
      });
      router.push("/tutor/questions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AuthGuard roles={["admin", "tutor"]}><PageShell title="Edit Question"><p className="text-sm text-zinc-400">Loading...</p></PageShell></AuthGuard>;

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Edit Question">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400">Subject</label>
              <select value={form.subject} onChange={(e) => update("subject", e.target.value)} className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white">
                {SUBJECTS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400">Difficulty</label>
              <select value={form.difficulty} onChange={(e) => update("difficulty", e.target.value)} className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white">
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Topic</label>
            <input value={form.topic} onChange={(e) => update("topic", e.target.value)} className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Past Paper Year</label>
            <input value={form.past_paper_year} onChange={(e) => update("past_paper_year", e.target.value)} type="number" className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-zinc-400">Question (Markdown/LaTeX)</label>
            </div>
            <textarea value={form.stem} onChange={(e) => update("stem", e.target.value)} rows={3} className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white font-mono" />
            {form.stem && (
              <div className="mt-2 p-3 rounded-xl border border-dashed border-[#2b3052] bg-[#0f1224]/50">
                <p className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Live Preview</p>
                <MarkdownRenderer content={form.stem} />
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">
              Diagram / Image <span className="text-zinc-500">(optional)</span>
            </label>
            {form.image_url && !imageFile && (
              <div className="mb-3">
                <p className="text-xs text-zinc-500 mb-2">Current Image:</p>
                <img src={form.image_url} alt="Question diagram" className="max-h-40 rounded border border-[#2b3052]" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) setImageFile(e.target.files[0]);
              }}
              className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-[#2b3052] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-600 cursor-pointer"
            />
            {imageFile && (
              <p className="mt-2 text-xs text-emerald-400">
                New selection: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          <div className="space-y-2">
            {(["A", "B", "C", "D"] as const).map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#2b3052] text-xs font-bold text-zinc-400">{opt}</span>
                <input value={form[`option_${opt.toLowerCase()}` as keyof typeof form] as string} onChange={(e) => update(`option_${opt.toLowerCase()}`, e.target.value)} className="flex-1 rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white" />
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Correct Option</label>
            <div className="flex gap-2">
              {(["A", "B", "C", "D"] as const).map((opt) => (
                <button key={opt} type="button" onClick={() => update("correct_option", opt)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${form.correct_option === opt ? "bg-emerald-600 text-white" : "border border-[#2b3052] bg-[#0a0c14] text-zinc-400"}`}>{opt}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Explanation</label>
            <textarea value={form.explanation} onChange={(e) => update("explanation", e.target.value)} rows={2} className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={saving} className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
