"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/api";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = use(searchParams);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setError("Missing reset token"); return; }
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0f1a] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2b3052] bg-[#16192b]/80 p-8">
        <div className="mb-8 flex flex-col items-center">
          <Image src="/logo.png" alt="Fusion College Logo" width={64} height={64} className="mb-3 rounded-full border border-[#2b3052] bg-white object-contain shadow-lg" />
          <h2 className="text-xl font-bold text-white">Set New Password</h2>
        </div>

        {done ? (
          <div className="text-center">
            <p className="mb-4 text-sm text-emerald-400">Password reset successfully!</p>
            <button onClick={() => router.push("/login")} className="w-full rounded-lg bg-[#3d4193] py-3 font-semibold text-white">Sign In</button>
          </div>
        ) : (
          <>
            {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-400">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">New Password (min 8 chars)</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full rounded-lg border border-[#2b3052] bg-[#0d0f1a] px-4 py-3 text-white" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#3d4193] py-3 font-semibold text-white disabled:opacity-50">
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
