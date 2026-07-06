"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";

export default function ImportQuestionsPage() {
  const router = useRouter();
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ count: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const parsed = JSON.parse(jsonText);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const data = await apiFetch<unknown[]>("/api/questions/bulk", {
        method: "POST",
        body: JSON.stringify(arr),
      });
      setResult({ count: data.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed. Check JSON format.");
    } finally {
      setSaving(false);
    }
  };

  const sample = [
    {
      subject: "bio", topic: "Cell Structure", difficulty: "easy",
      stem: "Sample question?", options: { A: "a", B: "b", C: "c", D: "d" },
      correct_option: "A", explanation: "Because...",
    },
  ];

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Bulk Import">
        <p className="mb-3 text-xs text-zinc-500">
          Paste a JSON array of questions. Each must have: subject, topic, difficulty, stem, options (A-D), correct_option.
        </p>
        <button
          onClick={() => setJsonText(JSON.stringify(sample, null, 2))}
          className="mb-3 text-xs text-cyan-400"
        >
          Insert sample format
        </button>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={12}
          className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white font-mono"
          placeholder='[{ "subject": "bio", "topic": "...", ... }]'
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {result && <p className="mt-2 text-sm text-emerald-400">Imported {result.count} questions!</p>}
        <div className="mt-3 flex gap-2">
          <button onClick={handleSubmit} disabled={saving || !jsonText.trim()} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Importing..." : "Import"}
          </button>
          <button onClick={() => router.push("/tutor/questions")} className="rounded-xl bg-[#16192b] px-6 py-3 text-sm text-zinc-300">Cancel</button>
        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
