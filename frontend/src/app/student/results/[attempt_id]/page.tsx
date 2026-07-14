"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Check, 
  X,
  Target
} from "lucide-react";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { apiFetch, formatSubjectName } from "@/lib/api";
import { Card } from "@/components/Brand";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface ReviewItem {
  question_id: string;
  stem: string;
  options: Record<string, string>;
  selected_option: string | null;
  correct_option: string;
  explanation: string | null;
  is_correct: boolean | null;
}

interface SubjectStat {
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
}

interface ResultData {
  attempt_id: string;
  status: string;
  total_score: number | null;
  subject_breakdown: Record<string, SubjectStat> | null;
  rank_in_batch: number | null;
  review: ReviewItem[] | null;
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ attempt_id: string }>;
}) {
  const { attempt_id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isScoreFlipped, setIsScoreFlipped] = useState(false);
  const [reviewRequestOpen, setReviewRequestOpen] = useState(false);
  const [reviewReason, setReviewReason] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    apiFetch<ResultData>(`/api/tests/attempts/${attempt_id}/result`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [attempt_id]);

  const navigateTo = (index: number) => {
    if (index > reviewIndex) setDirection(1);
    else setDirection(-1);
    setReviewIndex(index);
  };

  const handleReviewRequest = async (questionId: string) => {
    if (!reviewReason.trim()) return;
    setSubmittingReview(true);
    try {
      await apiFetch(`/api/questions/${questionId}/review`, {
        method: "POST",
        body: JSON.stringify({ reason: reviewReason }),
      });
      setReviewRequestOpen(false);
      setReviewReason("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit review request");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (error) {
    return (
      <AuthGuard roles={["student", "parent"]}>
        <div className="flex min-h-screen items-center justify-center bg-[#080a14] p-6 bg-grid-glow bg-dot-pattern">
          <Card className="max-w-xs text-center border-red-500/20 bg-red-950/15">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-red-400">{error}</p>
            <button onClick={() => router.back()} className="mt-4 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider">
              Go Back
            </button>
          </Card>
        </div>
      </AuthGuard>
    );
  }

  if (!data) {
    return (
      <AuthGuard roles={["student", "parent"]}>
        <div className="flex min-h-screen items-center justify-center bg-[#080a14] p-6 bg-grid-glow bg-dot-pattern">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400 mr-2" />
          <p className="text-sm font-semibold text-slate-400">Loading Result Details...</p>
        </div>
      </AuthGuard>
    );
  }

  const correctCount = data.subject_breakdown
    ? Object.values(data.subject_breakdown).reduce(
        (sum, s) => sum + s.correct,
        0,
      )
    : 0;

  const wrongCount = data.subject_breakdown
    ? Object.values(data.subject_breakdown).reduce((sum, s) => sum + s.wrong, 0)
    : 0;

  const skippedCount = data.subject_breakdown
    ? Object.values(data.subject_breakdown).reduce(
        (sum, s) => sum + s.skipped,
        0,
      )
    : 0;

  const reviewTransitionVariants = {
    initial: (dir: number) => ({
      x: dir * 40,
      opacity: 0
    }),
    active: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.25, ease: "easeOut" as const }
    },
    exit: (dir: number) => ({
      x: -dir * 40,
      opacity: 0,
      transition: { duration: 0.2, ease: "easeIn" as const }
    })
  };

  // Review mode
  if (showReview && data.review) {
    const item = data.review[reviewIndex];
    if (!item) {
      return (
        <AuthGuard roles={["student", "parent"]}>
          <div className="flex min-h-screen items-center justify-center bg-[#080a14] p-6 bg-grid-glow bg-dot-pattern">
            <p className="text-sm font-semibold text-slate-400">No review data available.</p>
          </div>
        </AuthGuard>
      );
    }

    const isLast = reviewIndex === data.review.length - 1;
    const userCorrect = item.is_correct === true;

    return (
      <AuthGuard roles={["student", "parent"]}>
        <div className="min-h-screen bg-[#080a14] bg-grid-glow bg-dot-pattern pb-32 safe-top safe-bottom">
          <header className="sticky top-0 z-20 border-b border-[#1e223c] bg-[#080a14]/80 px-4 py-3 backdrop-blur-xl">
            <div className="mx-auto max-w-2xl flex items-center justify-between">
              <h1 className="text-sm font-black text-white uppercase tracking-widest">Question Review</h1>
              <button
                onClick={() => setShowReview(false)}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Summary</span>
              </button>
            </div>
            {/* Quick selector dots */}
            <div className="mx-auto max-w-2xl mt-4 flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
              {data.review.map((r, i) => {
                let cls = "w-8 h-8 rounded-xl text-[11px] font-black flex items-center justify-center border transition-all cursor-pointer ";
                if (r.is_correct === true)
                  cls += "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-md shadow-emerald-500/5";
                else if (r.is_correct === false)
                  cls += "bg-red-500/10 border-red-500/40 text-red-400 shadow-md shadow-red-500/5";
                else
                  cls += "bg-[#0f1224]/80 border-[#1e223c] text-slate-500 hover:border-slate-600";
                if (i === reviewIndex) cls += " ring-2 ring-cyan-400 border-transparent scale-110";
                return (
                  <button
                    key={r.question_id}
                    className={cls}
                    onClick={() => navigateTo(i)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </header>

          <main className="px-4 py-6 relative">
            <div className="mx-auto max-w-2xl min-h-[300px]">
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={reviewIndex}
                  custom={direction}
                  variants={reviewTransitionVariants}
                  initial="initial"
                  animate="active"
                  exit="exit"
                  className="w-full absolute"
                >
                  <div className="mb-6 text-base font-medium leading-relaxed text-slate-200">
                    <MarkdownRenderer content={item.stem} />
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(item.options).map(([key, value]) => {
                      const isSelected = item.selected_option === key;
                      const isCorrectAnswer = item.correct_option === key;
                      let border = "border-[#1e223c]";
                      let bg = "bg-[#0f1224]/60";
                      let text = "text-slate-300";
                      let iconEl = null;

                      if (isCorrectAnswer) {
                        border = "border-emerald-500/50";
                        bg = "bg-emerald-500/10";
                        text = "text-emerald-400";
                        iconEl = <Check className="w-4 h-4 text-emerald-400 shrink-0" />;
                      } else if (isSelected && !item.is_correct) {
                        border = "border-red-500/50";
                        bg = "bg-red-500/10";
                        text = "text-red-400";
                        iconEl = <X className="w-4 h-4 text-red-400 shrink-0" />;
                      }

                      return (
                        <div
                          key={key}
                          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm transition-all ${border} ${bg} ${text}`}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black border border-current">
                            {key}
                          </span>
                          <span className="flex-1 font-medium pointer-events-none">
                            <MarkdownRenderer content={value} />
                          </span>
                          {iconEl}
                        </div>
                      );
                    })}
                  </div>

                  {item.explanation && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 rounded-2xl border border-[#1e223c] bg-[#0f1224]/40 p-5"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Explanation
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">
                        {item.explanation}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1e223c] bg-[#080a14]/90 px-4 py-4 backdrop-blur-xl safe-bottom">
            <div className="mx-auto max-w-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigateTo(Math.max(0, reviewIndex - 1))}
                  disabled={reviewIndex === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-[#1e223c] bg-[#0f1224]/60 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </motion.button>
                
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {userCorrect ? (
                    <span className="text-emerald-400 font-bold">Correct</span>
                  ) : item.is_correct === null ? (
                    <span className="text-slate-500 font-bold">Skipped</span>
                  ) : (
                    <span className="text-red-400 font-bold">Incorrect</span>
                  )}
                </div>

                {isLast ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowReview(false)}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg cursor-pointer"
                  >
                    Summary
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigateTo(reviewIndex + 1)}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
              
              <button
                onClick={() => setReviewRequestOpen(true)}
                className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-xs font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                Request Review for This Question
              </button>
            </div>
          </footer>

          {/* Review Request Modal */}
          <AnimatePresence>
            {reviewRequestOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                onClick={() => setReviewRequestOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-2xl border border-[#1e223c] bg-[#0d101d] p-6"
                >
                  <h3 className="text-sm font-bold text-white mb-4">Request Question Review</h3>
                  <textarea
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    placeholder="Explain why you believe this question is incorrect..."
                    className="w-full h-32 rounded-xl border border-[#2b3052] bg-[#0a0c14] px-4 py-3 text-sm text-white placeholder-zinc-600 resize-none"
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setReviewRequestOpen(false)}
                      className="flex-1 rounded-xl border border-[#2b3052] bg-[#16192b] py-3 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReviewRequest(item.question_id)}
                      disabled={submittingReview || !reviewReason.trim()}
                      className="flex-1 rounded-xl bg-amber-600 py-3 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50 cursor-pointer"
                    >
                      {submittingReview ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AuthGuard>
    );
  }

  // Summary view
  return (
    <AuthGuard roles={["student", "parent"]}>
      <div className="min-h-screen bg-[#080a14] bg-grid-glow bg-dot-pattern pb-28 safe-top safe-bottom">
        <header className="sticky top-0 z-20 border-b border-[#1e223c] bg-[#080a14]/80 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto max-w-2xl flex items-center justify-between">
            <h1 className="text-lg font-black text-white tracking-tight uppercase">Result Report</h1>
            <button
              onClick={() => router.push("/student")}
              className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Score card (Flip Animation) */}
            <div className="md:col-span-2 relative" style={{ perspective: 1000 }} onClick={() => setIsScoreFlipped(!isScoreFlipped)}>
              <motion.div
                animate={{ rotateX: isScoreFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                style={{ transformStyle: "preserve-3d", transformOrigin: "center" }}
                className="w-full h-full cursor-pointer"
              >
                {/* Front */}
                <div style={{ backfaceVisibility: "hidden" }} className="w-full h-full">
                  <Card className="text-center relative overflow-hidden group h-full flex flex-col justify-center items-center py-8">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 rounded-full blur-2xl pointer-events-none" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Score</p>
                    <p className="text-5xl font-black text-gradient tracking-tight">
                      {data.total_score?.toFixed(1) ?? "—"}
                    </p>
                    {data.rank_in_batch != null && (
                      <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400">
                        <Award className="w-3.5 h-3.5" />
                        <span>Batch Rank: #{data.rank_in_batch}</span>
                      </div>
                    )}
                    <p className="mt-4 text-[9px] text-cyan-500 font-bold opacity-60">Tap to flip</p>
                  </Card>
                </div>

                {/* Back */}
                <div 
                  style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)", position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} 
                  className="w-full h-full"
                >
                  <Card className="text-center relative overflow-hidden group h-full flex flex-col justify-center items-center py-6 border-cyan-500/30 bg-[#0d101d]">
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Performance Overview</p>
                    <div className="w-full px-8 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Accuracy</span>
                        <span className="font-bold text-emerald-400">
                          {correctCount + wrongCount > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Questions Attempted</span>
                        <span className="font-bold text-cyan-400">
                          {correctCount + wrongCount} / {correctCount + wrongCount + skippedCount}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            </div>

            {/* General metrics */}
            <div className="grid grid-cols-3 md:grid-cols-1 gap-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center flex flex-col justify-center">
                <div className="text-xl font-black text-emerald-400">{correctCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/80 mt-1">Correct</div>
              </div>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center flex flex-col justify-center">
                <div className="text-xl font-black text-red-400">{wrongCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-red-500/80 mt-1">Wrong</div>
              </div>
              <div className="rounded-2xl border border-slate-500/20 bg-slate-500/5 p-4 text-center flex flex-col justify-center">
                <div className="text-xl font-black text-slate-400">{skippedCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500/80 mt-1">Skipped</div>
              </div>
            </div>
          </div>

          {/* Subject breakdown */}
          {data.subject_breakdown && (
            <div className="mb-8 space-y-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                <Target className="w-3.5 h-3.5 text-violet-400" />
                <span>Subject Analysis</span>
              </h2>
              <div className="space-y-3">
                {Object.entries(data.subject_breakdown).map(([subject, stat]) => (
                  <Card key={subject} className="hover:border-slate-800 transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold capitalize text-white tracking-tight">
                        {formatSubjectName(subject)}
                      </h3>
                      <span className="text-sm font-black text-cyan-400">
                        {stat.score.toFixed(1)} pts
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/80" />
                        <span>{stat.correct} Correct</span>
                      </span>
                      <span className="text-red-400 flex items-center gap-0.5">
                        <XCircle className="w-3.5 h-3.5 text-red-400/80" />
                        <span>{stat.wrong} Wrong</span>
                      </span>
                      <span className="flex items-center gap-0.5">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>{stat.skipped} Skipped</span>
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Review button */}
          {data.review && data.review.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => {
                setReviewIndex(0);
                setShowReview(true);
              }}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 py-4 text-sm font-bold text-white shadow-lg shadow-cyan-500/10 cursor-pointer"
            >
              Review Incorrect & Correct Answers
            </motion.button>
          )}
        </main>
      </div>
      <MobileNav />
    </AuthGuard>
  );
}
