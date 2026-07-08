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
    <div className="min-h-screen bg-[#080a14] bg-grid-glow bg-dot-pattern safe-top safe-bottom md:pl-64">
      <header className="sticky top-0 z-20 border-b border-[#1e223c] bg-[#080a14]/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-lg md:max-w-4xl flex items-center justify-between">
          <BrandHeader />
        </div>
        {title && (
          <div className="mx-auto max-w-lg md:max-w-4xl mt-3">
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-extrabold text-white tracking-tight"
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
      className={`glass-panel rounded-2xl p-4 transition-shadow hover:shadow-lg hover:shadow-cyan-500/5 ${onClick ? "cursor-pointer" : ""} ${className}`}
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
      className="rounded-xl border border-[#1e223c] bg-[#05060b]/60 px-4 py-3 relative overflow-hidden group hover:border-[#7c3aed]/50 transition-colors"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#7c3aed]/5 to-[#06b6d4]/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 relative z-10">
        {label}
      </div>
      <div className="text-xl font-black text-cyan-400 mt-1 relative z-10 tracking-tight">
        {value}
      </div>
    </motion.div>
  );
}
