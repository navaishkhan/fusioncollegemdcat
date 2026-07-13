"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Loader2, ShieldCheck, Mail } from "lucide-react";

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
      <div className="w-full max-w-md rounded-3xl border border-[#2b3052] bg-[#16192b]/80 p-8 shadow-2xl backdrop-blur-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="Fusion College Logo"
            width={64}
            height={64}
            className="rounded-full border border-[#2b3052] bg-white object-contain shadow-lg"
          />
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">Forgot Password?</h2>
            <p className="mt-1 text-xs text-zinc-500">Enter your email and we'll notify the admin</p>
          </div>
        </div>

        {sent ? (
          /* Success State */
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-6 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
              <ShieldCheck className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-base font-bold text-emerald-300">Request Sent!</p>
              <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
                Your password reset request has been sent to the <span className="font-semibold text-white">admin</span>.
                They will reset your password and contact you shortly.
              </p>
            </div>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#1e2340] bg-[#0a0c14] px-4 py-2.5 text-xs text-zinc-400">
              <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span>Request sent for <b className="text-white">{email}</b></span>
            </div>
            <Link
              href="/login"
              className="mt-2 rounded-xl bg-[#1e2340] px-6 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-[#252a4a]"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                  Your Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#2b3052] bg-[#0d0f1a] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-[#3d4193] to-cyan-700 py-3 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending Request...</>
                ) : (
                  "Send Reset Request"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              Remember your password?{" "}
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
                Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
