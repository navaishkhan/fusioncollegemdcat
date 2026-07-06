"use client";

import { useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0f1a] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2b3052] bg-[#16192b]/80 p-8">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Fusion College Logo"
            width={64}
            height={64}
            className="mb-3 rounded-full border border-[#2b3052] bg-white object-contain shadow-lg"
          />
          <h2 className="text-xl font-bold text-white">Reset Password</h2>
        </div>

        {sent ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-4 text-center text-sm text-emerald-400">
            If that email is registered, a reset link has been sent. In development, check the server console for the token.
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-400">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#2b3052] bg-[#0d0f1a] px-4 py-3 text-white"
                  placeholder="your@email.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#3d4193] py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          <a href="/login" className="text-cyan-400">Back to Sign In</a>
        </p>
      </div>
    </div>
  );
}
