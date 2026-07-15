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
  };

  // ── Confirm screen ──────────────────────────────────────────────────────────
  if (pageState === "confirm") {
    return (
      <AuthGuard roles={["student"]}>
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#080a14] p-6 bg-grid-glow bg-dot-pattern safe-top safe-bottom">
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-sm rounded-3xl border border-[#1e223c] bg-[#0f1224]/85 p-8 text-center shadow-2xl backdrop-blur-xl"
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center mb-5">
              <GraduationCap className="w-7 h-7 text-[#7c3aed]" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Begin Timed Exam</h1>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Make sure you are in a quiet room with a stable internet connection.
              <br />
              Once you tap <strong>Begin</strong>, your server-side countdown timer starts immediately.
            </p>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-xs font-semibold text-red-400 bg-red-950/20 border border-red-500/20 p-3 rounded-xl flex items-center gap-1.5 justify-center"
              >
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </motion.p>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startTest}
              disabled={starting}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-bold text-white shadow-lg cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {starting ? "Initializing Attempt..." : "Begin Test"}
            </motion.button>
            <button
              onClick={() => router.back()}
              className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-sm rounded-3xl border border-[#1e223c] bg-[#0f1224]/85 p-8 text-center shadow-2xl backdrop-blur-xl"
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Test Submitted!</h1>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              {markingMode === "manual"
                ? "Your paper has been submitted. Your tutor will grade it manually and your score will appear shortly."
                : "Your exam paper has been submitted and auto-graded."}
            </p>
            {error && <p className="mt-3 text-xs font-semibold text-red-400">{error}</p>}
            {resultUrl && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(resultUrl)}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg cursor-pointer"
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
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400 mb-4" />
          <p className="text-sm font-bold text-slate-300">Locking Answers &amp; Grading...</p>
        </div>
      </AuthGuard>
    );
  }

  // ── Exam UI ─────────────────────────────────────────────────────────────────
  const isLast = currentIndex === questions.length - 1;

  return (
    <AuthGuard roles={["student"]}>
      <div className="flex min-h-screen flex-col bg-[#080a14] safe-top">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-[#1e223c] bg-[#080a14]/80 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
            {/* Left: Q counter + manual badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Q {currentIndex + 1}/{questions.length}
              </div>
              {markingMode === "manual" && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                  Manual Marking
                </span>
              )}
              {resumed && (
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                  Resumed
                </span>
              )}
            </div>

            {/* Centre: Timer */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold tabular-nums transition-all ${
              timeLeft !== null && timeLeft < 120
                ? "border-red-500/30 bg-red-950/20 text-red-400 animate-pulse"
                : "border-[#1e223c] bg-[#05060b]/60 text-cyan-400"
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeft !== null ? formatTime(timeLeft) : "--:--"}</span>
            </div>

            {/* Right: answered + review counts */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <span className="text-emerald-400">{answeredCount} ✓</span>
              {reviewCount > 0 && (
                <span className="text-amber-400">🔖 {reviewCount}</span>
              )}
            </div>
          </div>

          {/* Question palette */}
          <div className="mx-auto max-w-2xl mt-3 flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1">
            {questions.map((q, i) => {
              const a = answers[q.id];
              const isAnswered = !!a?.selected_option;
              const isMarked = !!a?.marked_for_review;
              const isCurrent = i === currentIndex;

              let cls =
                "relative w-8 h-8 rounded-xl text-[11px] font-black flex items-center justify-center border transition-all cursor-pointer ";

              if (isAnswered && isMarked) {
                // answered + flagged → green with amber ring
                cls += "bg-emerald-500/10 border-emerald-500/40 text-emerald-400";
              } else if (isAnswered) {
                cls += "bg-emerald-500/10 border-emerald-500/40 text-emerald-400";
              } else if (isMarked) {
                cls += "bg-amber-500/10 border-amber-500/40 text-amber-400";
              } else {
                cls += "bg-[#0f1224]/80 border-[#1e223c] text-slate-500 hover:border-slate-600";
              }

              if (isCurrent) cls += " ring-2 ring-cyan-400 border-transparent scale-110";

              return (
                <button key={q.id} className={cls} onClick={() => navigateTo(i)}>
                  {i + 1}
                  {/* Amber dot overlay for flagged+answered */}
                  {isAnswered && isMarked && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-[#080a14]" />
                  )}
                </button>
              );
            })}
          </div>
        </header>

        {/* ── Question area ────────────────────────────────────────────────── */}
        <main className="flex-1 px-4 py-6 pb-36 overflow-x-hidden">
          <div className="mx-auto max-w-2xl">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={pageTransitionVariants}
                initial="initial"
                animate="active"
                exit="exit"
              >
                {currentQ && (
                  <div>
                    {/* Tags */}
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-violet-300">
                        {formatSubjectName(currentQ.subject)}
                      </span>
                      {currentQ.topic && (
                        <span className="text-xs font-semibold text-slate-400">
                          {currentQ.topic}
                        </span>
                      )}
                      {currentA?.marked_for_review && (
                        <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                          MARKED FOR REVIEW
                        </span>
                      )}
                    </div>

                    {/* Stem */}
                    <div className="mb-6 text-base font-medium leading-relaxed text-slate-200">
                      <MarkdownRenderer content={currentQ.stem} />
                    </div>

                    {/* Image if present */}
                    {currentQ.image_url && (
                      <div className="mb-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentQ.image_url}
                          alt="Question diagram"
                          className="max-w-full rounded-xl border border-[#2b3052] shadow-lg"
                        />
                      </div>
                    )}

                    {/* Options */}
                    <div className="space-y-3">
                      {Object.entries(currentQ.options).map(([key, value]) => {
                        const selected = currentA?.selected_option === key;
                        return (
                          <motion.button
                            whileHover={{ scale: 1.005 }}
                            whileTap={{ scale: 0.995 }}
                            key={key}
                            onClick={() => selectOption(currentQ.id, key)}
                            className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm transition-all cursor-pointer ${
                              selected
                                ? "border-cyan-500 bg-cyan-600/10 text-white shadow-lg shadow-cyan-500/5"
                                : "border-[#1e223c] bg-[#0f1224]/60 text-slate-300 hover:border-slate-600 hover:bg-[#0f1224]/85"
                            }`}
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 mt-0.5 items-center justify-center rounded-full text-xs font-black border transition-all ${
                                selected
                                  ? "bg-cyan-500 border-transparent text-slate-900"
                                  : "border-[#1e223c] text-slate-500"
                              }`}
                            >
                              {key}
                            </span>
                            <div className="flex-1 font-medium -mt-0.5 pointer-events-none">
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
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* ── Bottom bar ──────────────────────────────────────────────────── */}
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1e223c] bg-[#080a14]/95 px-4 py-3 backdrop-blur-xl safe-bottom">
          <div className="mx-auto max-w-2xl flex items-center gap-2">
            {/* Prev */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigateTo(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 rounded-xl border border-[#1e223c] bg-[#0f1224]/60 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </motion.button>

            {/* Mark for Review */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => toggleReview(currentQ.id)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                currentA?.marked_for_review
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "border-[#1e223c] bg-[#0f1224]/60 text-slate-300 hover:bg-white/5"
              }`}
            >
              {currentA?.marked_for_review ? (
                <BookmarkCheck className="w-4 h-4 text-amber-400" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {currentA?.marked_for_review ? "Unmark" : "Review"}
              </span>
            </motion.button>

            {/* Submit Exam button (always visible) */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Submit</span>
            </motion.button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Next / Finish (navigational) */}
            {!isLast ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigateTo(Math.min(questions.length - 1, currentIndex + 1))}
                className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit</span>
              </motion.button>
            )}
          </div>
        </footer>

        {/* ── Submit Confirmation Modal ────────────────────────────────────── */}
        <AnimatePresence>
          {showSubmitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={() => setShowSubmitModal(false)}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-3xl border border-[#1e223c] bg-[#0d101d] p-6 shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <Send className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Submit Exam</h2>
                      <p className="text-[10px] text-slate-500">This action cannot be undone</p>
                    </div>
                  </div>
                  <button onClick={() => setShowSubmitModal(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                    <div className="text-xl font-black text-emerald-400">{answeredCount}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/70 mt-0.5">Answered</div>
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                    <div className="text-xl font-black text-amber-400">{reviewCount}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-amber-500/70 mt-0.5">Flagged</div>
                  </div>
                  <div className="rounded-2xl border border-slate-500/20 bg-slate-500/5 p-3 text-center">
                    <div className="text-xl font-black text-slate-400">{skippedCount}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500/70 mt-0.5">Skipped</div>
                  </div>
                </div>

                {skippedCount > 0 && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/8 p-3 text-xs text-amber-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>You have {skippedCount} unanswered question{skippedCount > 1 ? "s" : ""}. Skipped questions score 0.</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSubmitModal(false)}
                    className="flex-1 rounded-xl border border-[#2b3052] bg-[#0f1224] py-3 text-sm font-bold text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    Continue
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Confirm Submit
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
