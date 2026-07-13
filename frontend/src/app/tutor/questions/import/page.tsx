"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";
import { Camera, Loader2, CheckCircle2, XCircle, Trash2, Send, ScanLine, ImagePlus } from "lucide-react";

const SUBJECTS = ["bio", "chem", "physics", "english", "logical_reasoning"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

interface ScannedQuestion {
  id: string;
  stem: string;
  options: { A: string; B: string; C: string; D: string };
  subject: string;
  topic: string;
  difficulty: string;
  correct_option: string;
  explanation: string;
  status: "pending" | "saving" | "saved" | "error";
  imagePreview?: string;
}

export default function ImportQuestionsPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<ScannedQuestion[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-scanned
    e.target.value = "";

    const imagePreview = URL.createObjectURL(file);
    setScanning(true);
    setScanError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/questions/extract-from-image", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${JSON.parse(localStorage.getItem("fusion_mdcat_tokens") || "{}").access_token}`,
        },
      });

      if (!res.ok) throw new Error("OCR failed — try a clearer image");
      const data = await res.json();

      const newQ: ScannedQuestion = {
        id: crypto.randomUUID(),
        stem: data.stem || "",
        options: {
          A: data.options?.A || "",
          B: data.options?.B || "",
          C: data.options?.C || "",
          D: data.options?.D || "",
        },
        subject: "bio",
        topic: "",
        difficulty: "medium",
        correct_option: "A",
        explanation: "",
        status: "pending",
        imagePreview,
      };
      setQueue((prev) => [newQ, ...prev]);
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const updateQ = (id: string, field: string, value: string) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (id: string, opt: "A" | "B" | "C" | "D", value: string) => {
    setQueue((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, options: { ...q.options, [opt]: value } } : q
      )
    );
  };

  const removeQ = (id: string) => setQueue((prev) => prev.filter((q) => q.id !== id));

  const saveOne = async (q: ScannedQuestion) => {
    setQueue((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: "saving" } : x)));
    try {
      await apiFetch("/api/questions", {
        method: "POST",
        body: JSON.stringify({
          subject: q.subject,
          topic: q.topic || "General",
          difficulty: q.difficulty,
          stem: q.stem,
          options: q.options,
          correct_option: q.correct_option,
          explanation: q.explanation || null,
          image_url: null,
        }),
      });
      setQueue((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: "saved" } : x)));
      setSavedCount((c) => c + 1);
    } catch {
      setQueue((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: "error" } : x)));
    }
  };

  const saveAll = async () => {
    const pending = queue.filter((q) => q.status === "pending");
    for (const q of pending) await saveOne(q);
  };

  const pendingCount = queue.filter((q) => q.status === "pending").length;

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Camera Import">
        {/* Scanner button */}
        <div className="mb-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageScan}
            className="hidden"
            id="camera-input"
          />
          <label
            htmlFor="camera-input"
            className={`flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-6 text-sm font-bold transition-all
              ${scanning
                ? "animate-pulse border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                : "border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:border-cyan-500/60 hover:bg-cyan-500/10"
              }`}
          >
            {scanning ? (
              <><Loader2 className="h-6 w-6 animate-spin" /><span>Analyzing Image...</span></>
            ) : (
              <><Camera className="h-6 w-6" /><span>Tap to Scan MCQ Image</span><ImagePlus className="h-5 w-5 opacity-50" /></>
            )}
          </label>
          <p className="mt-2 text-center text-[10px] font-semibold text-zinc-500">
            Snap or upload a photo of any MCQ — it will be extracted automatically
          </p>
          {scanError && <p className="mt-2 text-center text-xs text-red-400">{scanError}</p>}
        </div>

        {/* Stats bar */}
        {queue.length > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-[#0d1020] px-4 py-2.5">
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><ScanLine className="h-3.5 w-3.5 text-cyan-400" /><b className="text-white">{queue.length}</b> scanned</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /><b className="text-white">{savedCount}</b> saved</span>
            </div>
            {pendingCount > 0 && (
              <button
                onClick={saveAll}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
              >
                <Send className="h-3.5 w-3.5" />
                Save All ({pendingCount})
              </button>
            )}
          </div>
        )}

        {/* Queue */}
        <div className="space-y-4">
          {queue.map((q) => (
            <div
              key={q.id}
              className={`rounded-2xl border p-4 transition-all ${
                q.status === "saved"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : q.status === "error"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-[#1e2340] bg-[#0a0c14]"
              }`}
            >
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {q.status === "saved" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {q.status === "error" && <XCircle className="h-4 w-4 text-red-400" />}
                  {q.status === "saving" && <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />}
                  {q.status === "pending" && <ScanLine className="h-4 w-4 text-zinc-400" />}
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    {q.status === "saved" ? "Saved ✓" : q.status === "error" ? "Failed" : q.status === "saving" ? "Saving..." : "Review"}
                  </span>
                </div>
                <button onClick={() => removeQ(q.id)} className="text-zinc-600 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Image preview */}
              {q.imagePreview && (
                <img src={q.imagePreview} alt="scanned" className="mb-3 w-full rounded-xl object-contain max-h-40 border border-[#1e2340]" />
              )}

              {/* Metadata row */}
              <div className="mb-3 grid grid-cols-3 gap-2">
                <select
                  value={q.subject}
                  onChange={(e) => updateQ(q.id, "subject", e.target.value)}
                  disabled={q.status === "saved"}
                  className="rounded-xl border border-[#2b3052] bg-[#0a0c14] px-2 py-2 text-xs text-white disabled:opacity-50"
                >
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
                <select
                  value={q.difficulty}
                  onChange={(e) => updateQ(q.id, "difficulty", e.target.value)}
                  disabled={q.status === "saved"}
                  className="rounded-xl border border-[#2b3052] bg-[#0a0c14] px-2 py-2 text-xs text-white disabled:opacity-50"
                >
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input
                  value={q.topic}
                  onChange={(e) => updateQ(q.id, "topic", e.target.value)}
                  placeholder="Topic"
                  disabled={q.status === "saved"}
                  className="rounded-xl border border-[#2b3052] bg-[#0a0c14] px-2 py-2 text-xs text-white placeholder-zinc-600 disabled:opacity-50"
                />
              </div>

              {/* Stem */}
              <textarea
                value={q.stem}
                onChange={(e) => updateQ(q.id, "stem", e.target.value)}
                rows={2}
                disabled={q.status === "saved"}
                placeholder="Question stem..."
                className="mb-2 w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2 text-xs text-white placeholder-zinc-600 disabled:opacity-50"
              />

              {/* Options */}
              <div className="mb-3 space-y-1.5">
                {(["A", "B", "C", "D"] as const).map((opt) => (
                  <div key={opt} className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${q.correct_option === opt ? "bg-emerald-600 text-white" : "border border-[#2b3052] text-zinc-400"}`}>
                      {opt}
                    </span>
                    <input
                      value={q.options[opt]}
                      onChange={(e) => updateOption(q.id, opt, e.target.value)}
                      disabled={q.status === "saved"}
                      placeholder={`Option ${opt}`}
                      className="flex-1 rounded-lg border border-[#2b3052] bg-[#0a0c14] px-2 py-1.5 text-xs text-white placeholder-zinc-600 disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>

              {/* Correct option selector */}
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-zinc-500">Correct:</span>
                {(["A", "B", "C", "D"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={q.status === "saved"}
                    onClick={() => updateQ(q.id, "correct_option", opt)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed ${q.correct_option === opt ? "bg-emerald-600 text-white" : "border border-[#2b3052] text-zinc-400 hover:border-emerald-500"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Save button */}
              {q.status === "pending" && (
                <button
                  onClick={() => saveOne(q)}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-bold text-white hover:opacity-90"
                >
                  Save This Question
                </button>
              )}
              {q.status === "error" && (
                <button
                  onClick={() => { updateQ(q.id, "status", "pending"); saveOne(q); }}
                  className="w-full rounded-xl bg-red-600/30 py-2 text-xs font-bold text-red-300 hover:bg-red-600/50"
                >
                  Retry
                </button>
              )}
            </div>
          ))}

          {queue.length === 0 && !scanning && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#1e2340] py-12 text-center">
              <Camera className="h-10 w-10 text-zinc-700" />
              <p className="text-sm font-semibold text-zinc-500">No questions scanned yet</p>
              <p className="text-xs text-zinc-600">Tap the button above to scan your first MCQ image</p>
            </div>
          )}
        </div>

        {savedCount > 0 && (
          <button
            onClick={() => router.push("/tutor/questions")}
            className="mt-6 w-full rounded-xl bg-[#16192b] py-3 text-sm font-semibold text-zinc-300 hover:bg-[#1e2340]"
          >
            ✓ Done — View All Questions
          </button>
        )}
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
