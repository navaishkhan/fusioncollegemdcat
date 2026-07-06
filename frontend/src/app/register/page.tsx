"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/api";

const ROLES = ["student", "tutor", "parent"] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    password: "",
    role: "student",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d0f1a] p-4 safe-top safe-bottom">
      <div className="pointer-events-none absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-blue-900/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-purple-900/15 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2b3052] bg-[#16192b]/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Fusion College Logo"
            width={64}
            height={64}
            className="mb-3 rounded-full border border-[#2b3052] bg-white object-contain shadow-lg"
          />
          <h2 className="text-xl font-bold tracking-tight text-white">Create Account</h2>
          <p className="mt-1 text-sm text-zinc-400">Join Fusion MDCAT</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Full Name</label>
            <input
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              required
              className="w-full rounded-lg border border-[#2b3052] bg-[#0d0f1a] px-4 py-3 text-white placeholder-zinc-500"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              className="w-full rounded-lg border border-[#2b3052] bg-[#0d0f1a] px-4 py-3 text-white placeholder-zinc-500"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Phone (optional)</label>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full rounded-lg border border-[#2b3052] bg-[#0d0f1a] px-4 py-3 text-white placeholder-zinc-500"
              placeholder="03XX-XXXXXXX"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Role</label>
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="w-full rounded-lg border border-[#2b3052] bg-[#0d0f1a] px-4 py-3 text-white"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-400">Password (min 8 chars)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-[#2b3052] bg-[#0d0f1a] px-4 py-3 text-white placeholder-zinc-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-[#3d4193] py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <button onClick={() => router.push("/login")} className="text-cyan-400">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
