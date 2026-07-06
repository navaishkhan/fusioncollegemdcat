"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";

interface Batch {
  id: string;
  name: string;
  description: string | null;
}

export default function AssignTestPage({
  params,
}: {
  params: Promise<{ test_id: string }>;
}) {
  const { test_id } = use(params);
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<Batch[]>("/api/batches")
      .then(setBatches)
      .catch((e) => setError(e.message));
  }, []);

  const handleSubmit = async () => {
    if (!selectedBatch) {
      setError("Select a batch");
      return;
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      setError("Set start and end date/time");
      return;
    }

    const startAt = new Date(`${startDate}T${startTime}`).toISOString();
    const endAt = new Date(`${endDate}T${endTime}`).toISOString();

    if (new Date(endAt) <= new Date(startAt)) {
      setError("End time must be after start time");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/tests/assignments", {
        method: "POST",
        body: JSON.stringify({
          test_id,
          batch_id: selectedBatch,
          start_at: startAt,
          end_at: endAt,
        }),
      });
      router.push("/tutor/tests");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to assign test");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Assign Test">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Batch</label>
            {batches.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No batches yet.{" "}
                <button
                  onClick={() => router.push("/tutor/batches")}
                  className="text-cyan-400"
                >
                  Create one
                </button>
              </p>
            ) : (
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white"
              >
                <option value="">Select a batch...</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Start Date & Time</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                type="date"
                className="rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white"
              />
              <input
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                type="time"
                className="rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">End Date & Time</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                type="date"
                className="rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white"
              />
              <input
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                type="time"
                className="rounded-xl border border-[#2b3052] bg-[#0a0c14] px-3 py-2.5 text-sm text-white"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Assigning..." : "Assign Test"}
          </button>
        </div>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
