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
    <div className="min-h-screen bg-[#080a14] bg-grid-glow bg-dot-pattern safe-top safe-bottom">
      <header className="sticky top-0 z-20 border-b border-brand-border bg-[#080a14]/80 px-6 py-3 backdrop-blur-xl shadow-sm">
        <div className="max-w-[1400px] flex items-center justify-between">
          <BrandHeader />
        </div>
        {title && (
          <div className="max-w-[1400px] mt-3">
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
        className="max-w-[1400px] px-6 py-4 pb-28"
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
      initial={{ rotateX: 10, y: 15, opacity: 0 }}
      animate={{ rotateX: 0, y: 0, opacity: 1 }}
      whileHover={onClick ? { y: -6, scale: 1.015, rotateX: -2, rotateY: 1.5 } : { y: -3, scale: 1.005, rotateX: -0.5 }}
      whileTap={onClick ? { scale: 0.985 } : {}}
      onClick={onClick}
      className={`relative overflow-hidden glass-panel rounded-3xl p-5 backdrop-blur-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{ perspective: 1000 }}
    >
      {/* Dynamic Flowing Neon Water Background */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-15 overflow-hidden">
        <svg className="absolute bottom-0 left-0 w-full h-[60%]" viewBox="0 0 100 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="cardNeonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
            <filter id="cardGlowFilter">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <motion.path
            fill="url(#cardNeonGlow)"
            filter="url(#cardGlowFilter)"
            initial={{ d: "M 0,25 C 20,20 40,30 60,25 C 80,20 90,28 100,25 L 100,50 L 0,50 Z" }}
            animate={{
              d: [
                "M 0,25 C 20,20 40,30 60,25 C 80,20 90,28 100,25 L 100,50 L 0,50 Z",
                "M 0,25 C 25,30 38,18 63,23 C 83,28 92,20 100,25 L 100,50 L 0,50 Z",
                "M 0,25 C 20,20 40,30 60,25 C 80,20 90,28 100,25 L 100,50 L 0,50 Z"
              ]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            fill="url(#cardNeonGlow)"
            opacity="0.6"
            initial={{ d: "M 0,32 C 20,28 45,35 65,30 C 80,25 90,32 100,30 L 100,50 L 0,50 Z" }}
            animate={{
              d: [
                "M 0,32 C 20,28 45,35 65,30 C 80,25 90,32 100,30 L 100,50 L 0,50 Z",
                "M 0,32 C 25,35 48,25 68,32 C 82,38 92,28 100,30 L 100,50 L 0,50 Z",
                "M 0,32 C 20,28 45,35 65,30 C 80,25 90,32 100,30 L 100,50 L 0,50 Z"
              ]
            }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      <div className="relative z-10 w-full h-full">
        {children}
      </div>
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
