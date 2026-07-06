"use client";

import { useState } from "react";
import Image from "next/image";
import {
  apiFetch,
  dashboardPath,
  setStoredUser,
  setTokens,
  type AuthTokens,
  type User,
} from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const tokens = await apiFetch<AuthTokens>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setTokens(tokens);
      const user = await apiFetch<User>("/api/auth/me");
      setStoredUser(user);
      window.location.href = dashboardPath(user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d0f1a] p-4 safe-top safe-bottom">
      <div className="pointer-events-none absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-blue-900/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-red-900/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2b3052] bg-[#16192b]/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Fusion College Logo"
            width={64}
            height={64}
            className="mb-3 rounded-full border border-[#2b3052] bg-white object-contain shadow-lg"
          />
          <h2 className="text-xl font-bold tracking-tight text-white">FUSION MDCAT</h2>
          <p className="mt-1 text-sm text-zinc-400">Sign in to your portal</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-[#2b3052] bg-[#0d0f1a] px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-[#2b3052] bg-[#0d0f1a] px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3d4193] py-3 font-semibold text-white shadow-lg transition hover:bg-[#4d52bc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-cyan-400">
            Create Account
          </a>
        </p>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Forgot password?{" "}
          <a href="/forgot-password" className="text-cyan-400">
            Reset it
          </a>
        </p>
      </div>
    </div>
  );
}
