import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0d0f1a] p-6 safe-top safe-bottom">
      <div className="pointer-events-none absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-blue-900/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-purple-900/15 blur-[120px]" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="Fusion College Logo"
          width={88}
          height={88}
          className="mb-4 rounded-full border border-[#2b3052] bg-white object-contain shadow-lg"
          priority
        />
        <h1 className="text-2xl font-black tracking-tight text-white">Fusion MDCAT</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Practice tests, timed exams & analytics for MDCAT aspirants
        </p>
        <p className="mt-1 text-xs text-zinc-500">Fusion College Narowal</p>

        <Link
          href="/login"
          className="mt-8 w-full rounded-xl bg-[#3d4193] py-3.5 text-center text-sm font-semibold text-white shadow-lg transition hover:bg-[#4d52bc] active:bg-[#34377b]"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="mt-3 w-full rounded-xl border border-[#2b3052] py-3.5 text-center text-sm font-semibold text-zinc-300 transition hover:bg-[#16192b]"
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}
