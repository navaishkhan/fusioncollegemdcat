import Image from "next/image";
import Link from "next/link";

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
      <Image
        src="/logo.png"
        alt="Fusion College Logo"
        width={44}
        height={44}
        className="rounded-full border border-[#2b3052] bg-white object-contain"
        priority
      />
      <div>
        <div className="text-sm font-black tracking-tight text-white">{title}</div>
        <div className="text-[11px] text-zinc-400">{subtitle}</div>
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
    <div className="min-h-screen bg-[#0d0f1a] safe-top safe-bottom">
      <header className="sticky top-0 z-20 border-b border-[#1e233d] bg-[#0d0f1a]/95 px-4 py-3 backdrop-blur-md">
        <BrandHeader />
        {title && (
          <h1 className="mt-3 text-lg font-bold text-white">{title}</h1>
        )}
      </header>
      <main className="px-4 py-4 pb-24">{children}</main>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#2b3052] bg-[#16192b]/80 p-4 ${className}`}
    >
      {children}
    </div>
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
    <div className="rounded-xl border border-[#1e233d] bg-[#0a0c14] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="text-lg font-bold text-cyan-400">{value}</div>
    </div>
  );
}
