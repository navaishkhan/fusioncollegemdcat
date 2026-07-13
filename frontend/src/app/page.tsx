"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { GraduationCap, ArrowRight, ShieldCheck } from "lucide-react";
import { FusionCanvas } from "@/components/FusionLogo3D";

export default function HomePage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 12 },
    },
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#080a14] p-6 bg-grid-glow bg-dot-pattern safe-top safe-bottom">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: "10s" }} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex w-full max-w-sm flex-col items-center text-center"
      >
        {/* Animated Badge */}
        <motion.div 
          variants={itemVariants}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-400"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>MDCAT Excellence</span>
        </motion.div>

        {/* Logo with Glow */}
        <motion.div
          variants={itemVariants}
          className="mb-4 relative group flex justify-center items-center"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="relative w-40 h-40 z-20 cursor-pointer">
            <FusionCanvas />
          </div>
        </motion.div>

        {/* Brand Name */}
        <motion.h1 
          variants={itemVariants}
          className="text-3xl font-black tracking-tight text-white uppercase"
        >
          FUSION <span className="text-gradient font-black">MDCAT</span>
        </motion.h1>

        {/* Description */}
        <motion.p 
          variants={itemVariants}
          className="mt-3 text-sm text-slate-400 max-w-[280px] leading-relaxed"
        >
          Master your MDCAT exams with timed tests, mock papers, and key topic analytics.
        </motion.p>
        
        <motion.p 
          variants={itemVariants}
          className="mt-1 text-xs text-slate-500 font-semibold"
        >
          Fusion College Narowal
        </motion.p>

        {/* Action Buttons */}
        <motion.div variants={itemVariants} className="mt-8 w-full space-y-3">
          <Link href="/login" passHref legacyBehavior>
            <motion.a
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </motion.a>
          </Link>
          
          <Link href="/register" passHref legacyBehavior>
            <motion.a
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center rounded-xl border border-[#1e223c] bg-transparent py-3.5 text-center text-sm font-semibold text-slate-300 transition-all cursor-pointer"
            >
              Create Account
            </motion.a>
          </Link>
        </motion.div>

        {/* Footer Info */}
        <motion.div 
          variants={itemVariants}
          className="mt-12 flex items-center gap-1 text-[10px] text-slate-600 font-semibold uppercase tracking-wider"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
          <span>Secure Portal</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

