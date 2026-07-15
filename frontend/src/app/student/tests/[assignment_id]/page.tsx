"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  CheckCircle,
  Clock,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  GraduationCap,
  ClipboardList,
  Pencil,
  X,
} from "lucide-react";
import { AuthGuard } from "@/components/MobileNav";
import { apiFetch, getStoredUser, formatSubjectName } from "@/lib/api";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface QuestionData {
  id: string;
  subject: string;
  topic: string;
  stem: string;
  image_url?: string | null;
  options: Record<string, string>;
}

interface StartResponse {
  attempt_id: string;
  server_deadline_at: string;
  questions: QuestionData[];
  saved_answers?: { question_id: string; selected_option: string | null; marked_for_review: boolean }[];
  marking_mode?: "auto" | "manual";
  resumed?: boolean;
}

interface AnswerDraft {
  selected_option: string | null;
  marked_for_review: boolean;
}

type PageState = "confirm" | "exam" | "submitting" | "done";

export default function ExamPage({
  params,
}: {
  params: Promise<{ assignment_id: string }>;
}) {
  const { assignment_id } = use(params);
  const router = useRouter();
  const user = getStoredUser();

  const [pageState, setPageState] = useState<PageState>("confirm");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [direction, setDirection] = useState(1);
  const [markingMode, setMarkingMode] = useState<"auto" | "manual">("auto");
  const [resumed, setResumed] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Save answers periodically
  const saveAnswers = useCallback(async () => {
    if (!attemptId) return;
    const draft = answersRef.current;
    const updates = Object.entries(draft)
      .filter(([, v]) => v.selected_option !== null || v.marked_for_review)
      .map(([qid, v]) => ({
        question_id: qid,
        selected_option: v.selected_option,
        marked_for_review: v.marked_for_review,
      }));
    if (updates.length === 0) return;
    try {
      await apiFetch(`/api/tests/attempts/${attemptId}/answers`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    } catch {
      // silently retry on next interval
    }
  }, [attemptId]);

  const handleSubmitRef = useRef<() => void>(() => {});

  // Timer tick
  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        handleSubmitRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  // Auto-save every 30s
  useEffect(() => {
    if (pageState !== "exam") return;
    saveTimerRef.current = setInterval(saveAnswers, 30000);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [pageState, saveAnswers]);

  // Clean save on close/unload
  useEffect(() => {
    if (pageState !== "exam") return;
    const handler = () => {
      const draft = answersRef.current;
      const updates = Object.entries(draft)
        .filter(([, v]) => v.selected_option !== null || v.marked_for_review)
        .map(([qid, v]) => ({
          question_id: qid,
          selected_option: v.selected_option,
          marked_for_review: v.marked_for_review,
        }));
      if (updates.length > 0) {
        const tokenData = JSON.parse(localStorage.getItem("fusion_mdcat_tokens") || "{}");
        fetch(`/api/tests/attempts/${attemptId}/answers`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tokenData.access_token || ""}`,
          },
          body: JSON.stringify(updates),
          keepalive: true,
        });
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pageState, attemptId]);

  const startTest = async () => {
    setStarting(true);
    setError(null);
    try {
      const data = await apiFetch<StartResponse>(
        `/api/tests/attempts/start?assignment_id=${assignment_id}`,
        { method: "POST" },
      );
      setAttemptId(data.attempt_id);
      setQuestions(data.questions);
      setDeadline(new Date(data.server_deadline_at).getTime());
      setMarkingMode(data.marking_mode ?? "auto");
      setResumed(data.resumed ?? false);

      // Build initial answers — pre-fill saved answers if resuming
      const initial: Record<string, AnswerDraft> = {};
      data.questions.forEach((q) => {
        initial[q.id] = { selected_option: null, marked_for_review: false };
      });
      if (data.saved_answers) {
        data.saved_answers.forEach((a) => {
          if (initial[a.question_id] !== undefined) {
            initial[a.question_id] = {
              selected_option: a.selected_option,
              marked_for_review: a.marked_for_review,
            };
          }
        });
      }
      setAnswers(initial);
      setPageState("exam");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start test");
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!attemptId || pageState === "submitting" || pageState === "done") return;
    setShowSubmitModal(false);
    setPageState("submitting");
    await saveAnswers();
    try {
      const data = await apiFetch<{ attempt_id: string }>(
        `/api/tests/attempts/${attemptId}/submit`,
        { method: "POST" },
      );
      setResultUrl(`/student/results/${data.attempt_id}`);
      setPageState("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submit failed");
      setPageState("exam");
    }
  }, [attemptId, pageState, saveAnswers]);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  const selectOption = (qid: string, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: {
        ...prev[qid],
        // Toggle off if re-tapping the same selected option
        selected_option: prev[qid]?.selected_option === option ? null : option,
      },
    }));
  };

  const toggleReview = (qid: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], marked_for_review: !prev[qid]?.marked_for_review },
    }));
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const navigateTo = (index: number) => {
    if (index > currentIndex) setDirection(1);
    else setDirection(-1);
    setCurrentIndex(index);
  };

  const currentQ = questions[currentIndex];
  const currentA = currentQ ? answers[currentQ.id] : null;
  const answeredCount = Object.values(answers).filter(
    (a) => a.selected_option !== null,
  ).length;
  const reviewCount = Object.values(answers).filter(
    (a) => a.marked_for_review,
  ).length;
  const skippedCount = questions.length - answeredCount;

  const pageTransitionVariants = {
    initial: (dir: number) => ({
      x: dir * 40,
      opacity: 0,
    }),
    active: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.25, ease: "easeOut" as const },
    },
    exit: (dir: number) => ({
      x: -dir * 40,
      opacity: 0,
      transition: { duration: 0.2, ease: "easeIn" as const },
    }),
  };  // ── Confirm screen ──────────────────────────────────────────────────────────
  if (pageState === "confirm") {
    return (
      <AuthGuard roles={["student"]}>
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#080a14] p-6 bg-grid-glow bg-dot-pattern safe-top safe-bottom">
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-full max-w-md rounded-3xl border border-[#1e223c] bg-[#0c0e1a]/90 p-8 shadow-2xl backdrop-blur-2xl"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 flex items-center justify-center mb-6">
              <GraduationCap className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-black text-white text-center tracking-tight uppercase">Begin Timed Exam</h1>
            <p className="mt-4 text-sm text-slate-300 text-center leading-relaxed">
              Make sure you are in a quiet room with a stable internet connection.
              Once you start, the server-side countdown timer will begin immediately and cannot be paused.
            </p>

            <div className="mt-6 space-y-3.5 bg-[#0f1120]/60 border border-[#1e223c] rounded-2xl p-4 text-xs text-slate-400">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Timer keeps running if you refresh or close the tab</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Your progress is auto-saved as you select answers</span>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-xs font-semibold text-red-400 bg-red-950/20 border border-red-500/20 p-3 rounded-xl flex items-center gap-1.5 justify-center"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={startTest}
              disabled={starting}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 py-4 text-sm font-bold text-white shadow-lg shadow-cyan-500/10 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-300"
            >
              <Play className="w-4 h-4 fill-current" />
              {starting ? "Initializing Attempt..." : "Begin Test"}
            </motion.button>

            <button
              onClick={() => router.back()}
              className="mt-4 w-full text-center text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel &amp; Go Back
            </button>
          </motion.div>
        </div>
      </AuthGuard>
    );
  }

  // ── Done screen ─────────────────────────────────────────────────────────────
  if (pageState === "done") {
    return (
      <AuthGuard roles={["student"]}>
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#080a14] p-6 bg-grid-glow bg-dot-pattern safe-top safe-bottom">
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-md rounded-3xl border border-[#1e223c] bg-[#0c0e1a]/90 p-8 text-center shadow-2xl backdrop-blur-2xl"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-400 animate-bounce" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Test Submitted!</h1>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              {markingMode === "manual"
                ? "Your paper has been submitted successfully. Your tutor will grade it manually and your score will appear shortly."
                : "Your exam paper has been submitted and auto-graded. Click below to view the detailed scorecard."}
            </p>
            {error && <p className="mt-3 text-xs font-semibold text-red-400">{error}</p>}

            {resultUrl && (
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => router.push(resultUrl)}
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/10 cursor-pointer transition-all"
              >
                View Score &amp; Explanations
              </motion.button>
            )}

            <button
              onClick={() => router.push("/student")}
              className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
            >
              Back to Dashboard
            </button>
          </motion.div>
        </div>
      </AuthGuard>
    );
  }

  // ── Submitting screen ───────────────────────────────────────────────────────
  if (pageState === "submitting") {
    return (
      <AuthGuard roles={["student"]}>
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#080a14] p-6 bg-grid-glow bg-dot-pattern safe-top safe-bottom">
          <div className="relative flex items-center justify-center">
            <span className="absolute h-16 w-16 animate-ping rounded-full bg-cyan-500/10" />
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-400" />
          </div>
          <p className="mt-6 text-sm font-extrabold text-white tracking-wider uppercase animate-pulse">Locking Answers &amp; Grading...</p>
        </div>
      </AuthGuard>
    );
  }

  // ── Exam UI ─────────────────────────────────────────────────────────────────
  const isLast = currentIndex === questions.length - 1;

  return (
    <AuthGuard roles={["student"]}>
      <div className="flex min-h-screen flex-col bg-[#080a14] bg-grid-glow bg-dot-pattern text-slate-100 safe-top">
        
        {/* ── Top Bar (Sticky, optimized for status & mobile navigation) ──────────────── */}
        <header className="sticky top-0 z-20 border-b border-[#1e223c] bg-[#080a14]/80 px-4 py-3.5 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-400 tracking-wider uppercase bg-[#0f1120] border border-[#1e223c] px-3 py-1.5 rounded-xl">
                Question {currentIndex + 1} of {questions.length}
              </span>
              {markingMode === "manual" && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-400 hidden sm:inline-block">
                  Manual Marking
                </span>
              )}
            </div>

            {/* Timer Centerpiece */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-black tabular-nums transition-all ${
              timeLeft !== null && timeLeft < 120
                ? "border-red-500 bg-red-950/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse"
                : "border-[#1e223c] bg-[#0c0e1a]/85 text-cyan-400 shadow-inner"
            }`}>
              <Clock className="w-4 h-4 shrink-0" />
              <span>{timeLeft !== null ? formatTime(timeLeft) : "--:--"}</span>
            </div>

            {/* Top Bar Counters */}
            <div className="flex items-center gap-2 bg-[#0c0e1a]/80 border border-[#1e223c] rounded-xl px-3 py-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progress:</span>
              <span className="text-xs font-black text-emerald-400">{answeredCount} ✓</span>
              {reviewCount > 0 && (
                <span className="text-xs font-black text-amber-400">🔖 {reviewCount}</span>
              )}
            </div>
          </div>
        </header>

        {/* ── Main Content Area ────────────────────────────────────────────────── */}
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-start pb-32">
          
          {/* Left Column: Navigation Sidebar (Hidden on mobile or pushed to top, sticky on desktop) */}
          <aside className="col-span-1 md:sticky md:top-24 space-y-4 hidden md:block">
            <div className="rounded-2xl border border-[#1e223c] bg-[#0c0e1a]/95 p-5 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Question Navigator</h3>
                <span className="text-[10px] font-bold text-slate-500 bg-[#0f1120] border border-[#1e223c] px-2 py-0.5 rounded-md">
                  {Math.round((answeredCount / questions.length) * 100)}% Done
                </span>
              </div>

              {/* Grid palette */}
              <div className="grid grid-cols-5 gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {questions.map((q, i) => {
                  const a = answers[q.id];
                  const isAnswered = !!a?.selected_option;
                  const isMarked = !!a?.marked_for_review;
                  const isCurrent = i === currentIndex;

                  let cls = "relative h-9 rounded-xl text-xs font-black flex items-center justify-center border transition-all cursor-pointer ";
                  if (isCurrent) {
                    cls += "bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-400/20";
                  } else if (isAnswered && isMarked) {
                    cls += "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20";
                  } else if (isAnswered) {
                    cls += "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25";
                  } else if (isMarked) {
                    cls += "bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25";
                  } else {
                    cls += "bg-[#0f1120] border-[#1e223c] text-slate-500 hover:border-slate-500 hover:text-slate-300";
                  }

                  return (
                    <button key={q.id} className={cls} onClick={() => navigateTo(i)}>
                      {i + 1}
                      {isAnswered && isMarked && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-[#0c0e1a]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-[#1e223c] space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" /> Answered</span>
                  <span className="font-bold text-slate-200">{answeredCount}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" /> Flagged</span>
                  <span className="font-bold text-slate-200">{reviewCount}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0f1120] border border-[#1e223c]" /> Unanswered</span>
                  <span className="font-bold text-slate-200">{skippedCount}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Question & Options View Area */}
          <main className="col-span-1 md:col-span-3">
            <div className="rounded-3xl border border-[#1e223c] bg-[#0c0e1a]/95 p-6 md:p-8 shadow-2xl backdrop-blur-2xl min-h-[400px] flex flex-col justify-between">
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={pageTransitionVariants}
                  initial="initial"
                  animate="active"
                  exit="exit"
                  className="flex-1 flex flex-col justify-between"
                >
                  {currentQ && (
                    <div>
                      {/* Tags Bar */}
                      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[#1e223c] pb-4">
                        <span className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-400">
                          {formatSubjectName(currentQ.subject)}
                        </span>
                        {currentQ.topic && (
                          <span className="rounded-lg bg-purple-500/5 border border-purple-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-purple-300">
                            {currentQ.topic}
                          </span>
                        )}
                        {currentA?.marked_for_review && (
                          <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-400 animate-pulse">
                            MARKED FOR REVIEW
                          </span>
                        )}
                      </div>

                      {/* Question Stem */}
                      <div className="mb-8 text-base md:text-lg font-medium leading-relaxed text-slate-100">
                        <MarkdownRenderer content={currentQ.stem} />
                      </div>

                      {/* Diagram Image */}
                      {currentQ.image_url && (
                        <div className="mb-8 overflow-hidden rounded-2xl border border-[#2b3052] bg-[#06080e] p-2 flex justify-center shadow-lg group transition-all duration-300 hover:border-cyan-500/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={currentQ.image_url}
                            alt="Question diagram"
                            className="max-h-[350px] object-contain rounded-xl"
                          />
                        </div>
                      )}

                      {/* Options Grid */}
                      <div className="space-y-3.5">
                        {Object.entries(currentQ.options).map(([key, value]) => {
                          const selected = currentA?.selected_option === key;
                          return (
                            <motion.button
                              whileHover={{ scale: 1.002 }}
                              whileTap={{ scale: 0.998 }}
                              key={key}
                              onClick={() => selectOption(currentQ.id, key)}
                              className={`flex w-full items-start gap-4 rounded-2xl border p-4.5 text-left text-sm transition-all duration-200 cursor-pointer ${
                                selected
                                  ? "border-cyan-500 bg-gradient-to-r from-cyan-950/20 to-purple-950/20 text-white shadow-xl shadow-cyan-500/5"
                                  : "border-[#1e223c] bg-[#070913]/40 text-slate-300 hover:border-slate-500 hover:bg-[#0f1120]"
                              }`}
                            >
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black border transition-all ${
                                  selected
                                    ? "bg-cyan-500 border-transparent text-[#080a14]"
                                    : "border-[#1e223c] text-slate-500 bg-[#0c0e1a]"
                                }`}
                              >
                                {key}
                              </span>
                              <div className="flex-1 font-medium pointer-events-none text-slate-200 pt-0.5">
                                <MarkdownRenderer content={value} />
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-6 rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-xs font-semibold text-red-400 flex items-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{error}</span>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* Mobile Navigation Drawer for question selector (Visible only on mobile) */}
        <div className="block md:hidden border-t border-[#1e223c] bg-[#080a14] px-4 py-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {questions.map((q, i) => {
              const a = answers[q.id];
              const isAnswered = !!a?.selected_option;
              const isMarked = !!a?.marked_for_review;
              const isCurrent = i === currentIndex;

              let cls = "relative shrink-0 w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center border transition-all ";
              if (isCurrent) {
                cls += "bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/20";
              } else if (isAnswered && isMarked) {
                cls += "bg-emerald-500/10 border-emerald-500/40 text-emerald-400";
              } else if (isAnswered) {
                cls += "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
              } else if (isMarked) {
                cls += "bg-amber-500/10 border-amber-500/30 text-amber-400";
              } else {
                cls += "bg-[#0c0e1a]/80 border-[#1e223c] text-slate-500";
              }

              return (
                <button key={q.id} className={cls} onClick={() => navigateTo(i)}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Sticky Bottom Bar ────────────────────────────────────────────── */}
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1e223c] bg-[#0c0e1a]/95 px-4 py-4.5 backdrop-blur-2xl safe-bottom">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Prev Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigateTo(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 rounded-xl border border-[#1e223c] bg-[#0f1120] px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-[#1e223c] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </motion.button>

              {/* Bookmark Review Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleReview(currentQ.id)}
                className={`flex items-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  currentA?.marked_for_review
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "border-[#1e223c] bg-[#0f1120] text-slate-300 hover:bg-[#1e223c]"
                }`}
              >
                {currentA?.marked_for_review ? (
                  <BookmarkCheck className="w-4 h-4 text-amber-400" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
                <span>{currentA?.marked_for_review ? "Unmark" : "Review Later"}</span>
              </motion.button>
            </div>

            <div className="flex items-center gap-2">
              {/* Direct Submit Button (Saves effort navigating to last slide) */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Submit Exam</span>
              </motion.button>

              {/* Next / Submit Slide Navigator */}
              {!isLast ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigateTo(Math.min(questions.length - 1, currentIndex + 1))}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg cursor-pointer hover:opacity-90"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Exam</span>
                </motion.button>
              )}
            </div>
          </div>
        </footer>

        {/* ── Submit Confirmation Modal ────────────────────────────────────── */}
        <AnimatePresence>
          {showSubmitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-4"
              onClick={() => setShowSubmitModal(false)}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-3xl border border-[#1e223c] bg-[#0c0e1a] p-6 shadow-2xl"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                      <Send className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white uppercase tracking-wider">Confirm Submission</h2>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Final Exam Grading</p>
                    </div>
                  </div>
                  <button onClick={() => setShowSubmitModal(false)} className="text-slate-500 hover:text-white transition-colors cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Score Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-center">
                    <div className="text-2xl font-black text-emerald-400">{answeredCount}</div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-emerald-500/70 mt-0.5">Answered</div>
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-center">
                    <div className="text-2xl font-black text-amber-400">{reviewCount}</div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-amber-500/70 mt-0.5">Flagged</div>
                  </div>
                  <div className="rounded-2xl border border-slate-500/20 bg-slate-500/5 p-3.5 text-center">
                    <div className="text-2xl font-black text-slate-400">{skippedCount}</div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-500/70 mt-0.5">Skipped</div>
                  </div>
                </div>

                {skippedCount > 0 && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4.5 text-xs text-amber-400 leading-relaxed">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-400" />
                    <span>You have <strong>{skippedCount} unanswered</strong> questions. Unanswered questions will receive 0 points.</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSubmitModal(false)}
                    className="flex-1 rounded-xl border border-[#2b3052] bg-[#0f1120] py-3.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Keep Working
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Now
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AuthGuard>
  );
}
