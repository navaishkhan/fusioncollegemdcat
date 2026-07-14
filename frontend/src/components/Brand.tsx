"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function BrandHeader({
  title = "Fusion MDCAT",
  subtitle = "Fusion College Narowal",
}: BrandHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <motion.div
        initial={{ rotate: -10, scale: 0.9 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring" as const, stiffness: 200, damping: 15 }}
      >
        <Image
          src="/logo.png"
          alt="Fusion College Logo"
          width={42}
          height={42}
          className="rounded-full border border-[#1e223c] bg-white object-contain shadow-md transition hover:rotate-12"
          priority
        />
      </motion.div>
      <div>
        <div className="text-sm font-black tracking-tight text-white">{title}</div>
        <div className="text-[10px] tracking-wider text-zinc-400 uppercase font-semibold">{subtitle}</div>
      </div>
    </div>
  );
}

export function PageShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="min-h-screen bg-[#080911] safe-top safe-bottom md:pl-[280px]">
      <header className="sticky top-0 z-20 border-b border-[rgba(255,255,255,0.08)] bg-[#030409]/60 px-4 py-3 backdrop-blur-3xl shadow-sm">
        <div className="mx-auto max-w-lg md:max-w-4xl flex items-center justify-between">
          <BrandHeader />
        </div>
        {title && (
          <div className="mx-auto max-w-lg md:max-w-4xl mt-3">
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-editorial text-white tracking-tight"
            >
              {title}
            </motion.h1>
          </div>
        )}
      </header>
      <motion.main 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mx-auto max-w-lg md:max-w-4xl px-4 py-4 pb-28"
      >
        {children}
      </motion.main>
    </div>
  );
}

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={onClick ? { y: -3, scale: 1.015 } : {}}
      whileTap={onClick ? { scale: 0.985 } : {}}
      onClick={onClick}
      className={`glass-panel glossy-border rounded-3xl p-5 backdrop-blur-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl glossy-border bg-[rgba(10,11,16,0.5)] backdrop-blur-2xl px-5 py-4 relative overflow-hidden group hover:border-[rgba(255,255,255,0.15)] transition-colors"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#7c3aed]/10 to-[#06b6d4]/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 relative z-10 mb-2">
        {label}
      </div>
      <div className="text-2xl font-editorial text-shimmer relative z-10">
        {value}
      </div>
    </motion.div>
  );
}

export function GlassInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(5,6,11,0.8)] px-4 py-3 text-sm text-white placeholder-zinc-500 shadow-inner backdrop-blur-md transition hover:border-[rgba(255,255,255,0.15)] focus:border-cyan-500/50 focus:bg-[#0a0c14] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 ${className}`}
      {...props}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  className = "",
}: {
  value: number | string;
  onChange: (val: number | string) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const handleDecrement = () => {
    const current = Number(value) || 0;
    const next = current - step;
    if (min !== undefined && next < min) return;
    onChange(next);
  };

  const handleIncrement = () => {
    const current = Number(value) || 0;
    const next = current + step;
    if (max !== undefined && next > max) return;
    onChange(next);
  };

  return (
    <div className={`flex items-stretch rounded-xl border border-[#2b3052] bg-[#0a0c14] overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        className="flex px-4 items-center justify-center bg-[#16192b] text-zinc-400 hover:text-white hover:bg-[#1e233d] transition-colors font-bold text-lg"
      >
        -
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full bg-transparent px-2 py-2.5 text-center text-sm font-bold text-white focus:outline-none"
      />
      <button
        type="button"
        onClick={handleIncrement}
        className="flex px-4 items-center justify-center bg-[#16192b] text-zinc-400 hover:text-white hover:bg-[#1e233d] transition-colors font-bold text-lg"
      >
        +
      </button>
    </div>
  );
}
