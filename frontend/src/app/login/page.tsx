"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowLeft } from "lucide-react";
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080a14] p-4 bg-grid-glow bg-dot-pattern safe-top safe-bottom">
      {/* Back button */}
      <Link href="/" passHref legacyBehavior>
        <motion.a 
          whileHover={{ x: -3 }}
          className="absolute top-6 left-6 flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </motion.a>
      </Link>

      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-[#1e223c] bg-[#0f1224]/85 p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-8 flex flex-col items-center">
          <motion.div
            whileHover={{ scale: 1.05, rotate: -2 }}
            className="mb-4 relative group"
          >
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md opacity-75" />
            <Image
              src="/logo.png"
              alt="Fusion College Logo"
              width={68}
              height={68}
              className="relative rounded-full border border-[#1e223c] bg-white object-contain shadow-lg p-0.5"
            />
          </motion.div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">
            FUSION <span className="text-gradient font-black">MDCAT</span>
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-400 uppercase tracking-widest">Sign in to your portal</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs font-semibold text-red-400"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-[#1e223c] bg-[#05060b] pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all"
                placeholder="your@email.com"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-[#1e223c] bg-[#05060b] pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer mt-2"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              "Sign In"
            )}
          </motion.button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#1e223c]/50 text-center space-y-2.5">
          <p className="text-xs text-slate-400 font-semibold">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-bold ml-1 transition-colors">
              Create Account
            </Link>
          </p>
          <p className="text-xs text-slate-400 font-semibold">
            Forgot password?{" "}
            <Link href="/forgot-password" className="text-cyan-400 hover:text-cyan-300 font-bold ml-1 transition-colors">
              Reset it
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

