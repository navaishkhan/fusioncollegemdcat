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

const SUBJECTS = ["bio", "chem", "physics", "english", "logical_reasoning"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
type Tab = "manual" | "auto";

export default function CreateTestPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("manual");

  // Test settings
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(150);
  const [marksPerQ, setMarksPerQ] = useState(1);
  const [negativeMarking, setNegativeMarking] = useState(-0.25);
  const [randomize, setRandomize] = useState(true);
  const [showReview, setShowReview] = useState(true);

  // Manual pick state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filterSubject, setFilterSubject] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // Auto-generate state
  const [autoRules, setAutoRules] = useState<
    { subject: string; count: number; difficulty: string }[]
  >(SUBJECTS.map((s) => ({ subject: s, count: 0, difficulty: "" })));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = filterSubject ? `?subject=${filterSubject}` : "";
    apiFetch<Question[]>(`/api/questions${params}`)
      .then(setQuestions)
      .catch((e) => setQuestionsError(e.message));
  }, [filterSubject]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateRule = (subject: string, field: string, value: string | number) => {
    setAutoRules((prev) =>
      prev.map((r) => (r.subject === subject ? { ...r, [field]: value } : r)),
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        title,
        description: description || null,
        duration_minutes: duration,
        marks_per_question: marksPerQ,
        negative_marking: negativeMarking,
        randomize_order: randomize,
        show_review_after_submit: showReview,
      };

      if (tab === "manual") {
        if (selectedIds.size === 0) {
          setError("Select at least one question");
          setSaving(false);
          return;
        }
        body.question_ids = Array.from(selectedIds);
      } else {
        const rules = autoRules.filter((r) => r.count > 0);
        if (rules.length === 0) {
          setError("Add at least one auto-generate rule with count > 0");
          setSaving(false);
          return;
        }
        body.auto_generate = rules.map((r) => ({
          subject: r.subject,
          count: r.count,
          difficulty: r.difficulty || null,
        }));
      }

      await apiFetch("/api/tests", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push("/tutor/tests");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create test");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Create Test">
        {/* Basic settings */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full Length MDCAT #1"
              className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any notes about this test"
              className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400">Duration (min)</label>
              <input
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                type="number"
                min={1}
                className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400">Marks per Q</label>
              <input
                value={marksPerQ}
                onChange={(e) => setMarksPerQ(Number(e.target.value))}
                type="number"
                step={0.5}
                min={0.5}
                className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400">
                Negative Marking
              </label>
              <input
                value={negativeMarking}
                onChange={(e) => setNegativeMarking(Number(e.target.value))}
                type="number"
                step={0.25}
                className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white"
              />
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2">
                <input
                  checked={randomize}
                  onChange={(e) => setRandomize(e.target.checked)}
                  type="checkbox"
                  className="accent-cyan-500"
                />
                <span className="text-xs text-zinc-400">Randomize order</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  checked={showReview}
                  onChange={(e) => setShowReview(e.target.checked)}
                  type="checkbox"
                  className="accent-cyan-500"
                />
                <span className="text-xs text-zinc-400">Show review</span>
              </label>
            </div>
          </div>

          {/* Tab selector */}
          <div className="flex rounded-xl border border-[#2b3052] overflow-hidden">
            <button
              onClick={() => setTab("manual")}
              className={`flex-1 py-2.5 text-sm font-semibold ${
                tab === "manual" ? "bg-[#3d4193] text-white" : "bg-[#0a0c14] text-zinc-400"
              }`}
            >
              Pick Questions
            </button>
            <button
              onClick={() => setTab("auto")}
              className={`flex-1 py-2.5 text-sm font-semibold ${
                tab === "auto" ? "bg-[#3d4193] text-white" : "bg-[#0a0c14] text-zinc-400"
              }`}
            >
              Auto Generate
            </button>
          </div>

          {/* Manual pick */}
          {tab === "manual" && (
            <div>
              <p className="mb-2 text-xs text-zinc-500">
                Selected: {selectedIds.size} question{selectedIds.size !== 1 ? "s" : ""}
              </p>
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setFilterSubject("")}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    !filterSubject
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-[#16192b] text-zinc-400"
                  }`}
                >
                  All
                </button>
                {SUBJECTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterSubject(s)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                      filterSubject === s
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "bg-[#16192b] text-zinc-400"
                    }`}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
              {questionsError && <p className="text-sm text-red-400">{questionsError}</p>}
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
                {questions.map((q) => {
                  const selected = selectedIds.has(q.id);
                  return (
                    <button
                      key={q.id}
                      onClick={() => toggleSelect(q.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? "border-cyan-500 bg-cyan-600/15"
                          : "border-[#2b3052] bg-[#16192b]/60"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                          selected
                            ? "border-cyan-500 bg-cyan-500 text-white"
                            : "border-[#2b3052] text-zinc-500"
                        }`}
                      >
                        {selected ? "✓" : ""}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-purple-300">
                            {q.subject}
                          </span>
                          <span className="rounded-full bg-[#0a0c14] px-1.5 py-0.5 text-[9px] text-zinc-400">
                            {q.difficulty}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-200 line-clamp-2">{q.stem}</p>
                      </div>
                    </button>
                  );
                })}
                {!questionsError && questions.length === 0 && (
                  <p className="text-center text-xs text-zinc-500">No questions found.</p>
                )}
              </div>
            </div>
          )}

          {/* Auto generate */}
          {tab === "auto" && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">
                Set how many questions to pick per subject.
              </p>
              {autoRules.map((rule) => (
                <Card key={rule.subject}>
                  <div className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm font-semibold capitalize text-white">
                      {rule.subject.replace("_", " ")}
                    </span>
                    <input
                      value={rule.count || ""}
                      onChange={(e) =>
                        updateRule(rule.subject, "count", parseInt(e.target.value) || 0)
                      }
                      type="number"
                      min={0}
                      max={200}
                      placeholder="Count"
                      className="w-20 rounded-lg border border-[#2b3052] bg-[#0a0c14] px-2 py-1.5 text-sm text-white text-center"
                    />
                    <select
                      value={rule.difficulty}
                      onChange={(e) => updateRule(rule.subject, "difficulty", e.target.value)}
                      className="flex-1 rounded-lg border border-[#2b3052] bg-[#0a0c14] px-2 py-1.5 text-sm text-white"
                    >
                      <option value="">Any</option>
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </Card>
              ))}
              <p className="text-xs text-zinc-500">
                Total:{" "}
                {autoRules.reduce((s, r) => s + (r.count || 0), 0)} questions
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Test"}
          </button>
        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
