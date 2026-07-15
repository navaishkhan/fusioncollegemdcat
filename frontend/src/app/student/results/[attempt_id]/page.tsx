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
  image_url?: string | null;
  options: Record<string, string>;
  selected_option: string | null;
  correct_option: string | null;
  explanation: string | null;
  is_correct: boolean | null;
  marked_for_review?: boolean;
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
  marking_mode?: "auto" | "manual";
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
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

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
      setReviewSuccess("Your review request was submitted. A tutor will respond soon.");
      setTimeout(() => setReviewSuccess(null), 5000);
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

  const pendingManualGrade =
    data.marking_mode === "manual" && data.total_score === null;
  const answersRevealed =
    !pendingManualGrade &&
    data.review?.some((r) => r.correct_option != null) !== false;

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
    const showAnswerKey = item.correct_option != null;

    return (
      <AuthGuard roles={["student", "parent"]}>
        <div className="min-h-screen bg-[#080a14] bg-grid-glow bg-dot-pattern pb-32 text-slate-100">
          {reviewSuccess && (
            <div className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-4 py-3 text-xs font-semibold text-emerald-400 shadow-lg text-center">
              {reviewSuccess}
            </div>
          )}

          <header className="sticky top-0 z-20 border-b border-[#1e223c] bg-[#080a14]/80 px-6 py-4 backdrop-blur-xl">
            <div className="max-w-7xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-sm font-black text-white uppercase tracking-wider">
                    Question Review
                  </h1>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                    Question {reviewIndex + 1} of {data.review.length}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReview(false)}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl transition-all hover:bg-white/8 hover:scale-[1.02]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Summary</span>
              </button>
            </div>
          </header>

          <main className="px-6 py-8">
            <div className="max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left/Center Pane: Question and Options */}
              <div className="lg:col-span-8 space-y-6">
                <Card className="border border-white/5 bg-white/3 p-6 md:p-8 shadow-2xl relative overflow-hidden">
                  <AnimatePresence mode="wait" initial={false} custom={direction}>
                    <motion.div
                      key={reviewIndex}
                      custom={direction}
                      variants={reviewTransitionVariants}
                      initial="initial"
                      animate="active"
                      exit="exit"
                    >
                      {!showAnswerKey && (
                        <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-400">
                          Answers and explanations will appear after your tutor finishes manual grading.
                        </div>
                      )}

                      {item.marked_for_review && (
                        <div className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                          <span>Marked for review during exam</span>
                        </div>
                      )}

                      {/* Question Stem */}
                      <div className="mb-8 text-base md:text-lg font-medium leading-relaxed text-slate-100">
                        <MarkdownRenderer content={item.stem} />
                      </div>

                      {/* Image if present */}
                      {item.image_url && (
                        <div className="mb-8 overflow-hidden rounded-2xl border border-[#2b3052] bg-[#06080e] p-2 flex justify-center shadow-lg">
                          <img
                            src={item.image_url}
                            alt="Question diagram"
                            className="max-h-[350px] object-contain rounded-xl"
                          />
                        </div>
                      )}
                      
                      {/* Options */}
                      <div className="space-y-4">
                        {Object.entries(item.options).map(([key, value]) => {
                          const isSelected = item.selected_option === key;
                          const isCorrectAnswer = showAnswerKey && item.correct_option === key;
                          let border = "border-white/5";
                          let bg = "bg-white/2 hover:bg-white/4";
                          let text = "text-slate-300";
                          let iconEl = null;

                          if (isCorrectAnswer) {
                            border = "border-emerald-500/50 bg-emerald-500/5";
                            text = "text-emerald-300";
                            iconEl = <Check className="w-5 h-5 text-emerald-400 shrink-0" />;
                          } else if (isSelected && item.is_correct === false) {
                            border = "border-red-500/50 bg-red-500/5";
                            text = "text-red-300";
                            iconEl = <X className="w-5 h-5 text-red-400 shrink-0" />;
                          } else if (isSelected) {
                            border = "border-cyan-500/50 bg-cyan-500/5";
                            text = "text-cyan-300";
                          }

                          return (
                            <motion.div
                              key={key}
                              whileHover={{ y: -2, scale: 1.005 }}
                              className={`flex items-start gap-4 rounded-2xl border p-4.5 text-sm transition-all duration-200 ${border} ${bg} ${text}`}
                            >
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black border transition-all ${
                                isCorrectAnswer 
                                  ? "bg-emerald-500 border-transparent text-[#080a14]" 
                                  : isSelected && item.is_correct === false 
                                    ? "bg-red-500 border-transparent text-[#080a14]" 
                                    : isSelected 
                                      ? "bg-cyan-500 border-transparent text-[#080a14]" 
                                      : "border-white/10 text-slate-400 bg-white/5"
                              }`}>
                                {key}
                              </span>
                              <span className="flex-1 font-medium pt-1">
                                <MarkdownRenderer content={value} />
                              </span>
                              {iconEl}
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </Card>
              </div>

              {/* Right Pane: Navigation, Explanation and Actions */}
              <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                
                {/* Clean Grid Selector Map */}
                <Card className="border border-white/5 bg-white/3 p-5 shadow-xl">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Test Navigation</h3>
                  </div>
                  <div className="grid grid-cols-5 gap-2 p-1">
                    {data.review.map((r, i) => {
                      let btnCls = "w-10 h-10 rounded-xl text-xs font-black flex items-center justify-center border transition-all cursor-pointer ";
                      if (r.is_correct === true)
                        btnCls += "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20";
                      else if (r.is_correct === false)
                        btnCls += "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20";
                      else
                        btnCls += "bg-white/3 border-white/5 text-slate-500 hover:bg-white/8 hover:text-slate-300";

                      if (i === reviewIndex) {
                        btnCls += " border-cyan-400 bg-cyan-500/15 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]";
                      }
                      
                      return (
                        <button
                          key={r.question_id}
                          className={btnCls}
                          onClick={() => navigateTo(i)}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Explanation Details */}
                {item.explanation ? (
                  <Card className="border border-white/5 bg-white/3 p-5 shadow-xl">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
                      <div className="w-2 h-4 rounded-full bg-cyan-400" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Tutor Explanation</h3>
                    </div>
                    <div className="text-sm leading-relaxed text-slate-300">
                      <MarkdownRenderer content={item.explanation} />
                    </div>
                  </Card>
                ) : (
                  <div className="rounded-3xl border border-white/5 bg-white/2 p-6 text-center text-slate-400 text-xs leading-relaxed">
                    <HelpCircle className="w-5 h-5 mx-auto mb-2 text-slate-500" />
                    No explanation has been provided for this question.
                  </div>
                )}

                {/* Tutor Request CTA */}
                <button
                  onClick={() => setReviewRequestOpen(true)}
                  className="w-full rounded-2xl border border-amber-500/20 bg-amber-500/5 py-4 text-xs font-black uppercase tracking-widest text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all cursor-pointer flex items-center justify-center gap-2.5"
                >
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Request Tutor Review</span>
                </button>
              </div>

            </div>
          </main>

          <footer className="fixed bottom-0 left-0 fixed-sidebar-offset right-0 z-30 border-t border-[#1e223c] bg-[#080a14]/90 px-6 py-4.5 backdrop-blur-xl safe-bottom">
            <div className="max-w-7xl flex items-center justify-between gap-4">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigateTo(Math.max(0, reviewIndex - 1))}
                disabled={reviewIndex === 0}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-white/8 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </motion.button>
              
              <div className="text-xs font-black uppercase tracking-widest border border-white/10 px-5 py-2.5 rounded-xl bg-white/2">
                {userCorrect ? (
                  <span className="text-emerald-400">Correct Answer</span>
                ) : item.is_correct === null ? (
                  <span className="text-slate-500">Unanswered</span>
                ) : (
                  <span className="text-red-400">Incorrect Answer</span>
                )}
              </div>

              {isLast ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowReview(false)}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg cursor-pointer"
                >
                  Summary Report
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigateTo(reviewIndex + 1)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </footer>

          {/* Review Request Modal */}
          <AnimatePresence>
            {reviewRequestOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4"
                onClick={() => setReviewRequestOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl glossy-border"
                >
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Request Question Review</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">A tutor will check and update your score if approved</p>
                  <textarea
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    placeholder="Provide a reason or write down your question for the tutor..."
                    className="w-full h-36 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-cyan-500 focus:outline-none resize-none"
                  />
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => setReviewRequestOpen(false)}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReviewRequest(item.question_id)}
                      disabled={submittingReview || !reviewReason.trim()}
                      className="flex-1 rounded-xl bg-amber-600 py-3.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50 cursor-pointer hover:bg-amber-500 transition-colors"
                    >
                      {submittingReview ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <MobileNav />
        </div>
      </AuthGuard>
    );
  }

  // Summary view
  const totalQuestions = correctCount + wrongCount + skippedCount;
  const accuracyPercent = totalQuestions > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;
  const scoreProgressPercent = data.total_score ? Math.min(100, Math.round((data.total_score / (totalQuestions || 1)) * 100)) : 0;

  return (
    <AuthGuard roles={["student", "parent"]}>
      <div className="min-h-screen bg-[#080a14] bg-grid-glow bg-dot-pattern pb-28 safe-top safe-bottom text-slate-100">
        
        <header className="sticky top-0 z-20 border-b border-[#1e223c] bg-[#080a14]/80 px-6 py-4 backdrop-blur-xl">
          <div className="max-w-7xl flex items-center justify-between">
            <h1 className="text-lg font-black text-white tracking-tight uppercase">Result Report</h1>
            <button
              onClick={() => router.push("/student")}
              className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer bg-[#0c0e1a]/85 border border-[#1e223c] px-3.5 py-2 rounded-xl"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          </div>
        </header>

        <main className="max-w-7xl px-6 py-6 md:py-8">
          {pendingManualGrade && (
            <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
              <p className="text-sm font-bold text-amber-400 uppercase tracking-wider">Pending Tutor Grading</p>
              <p className="mt-2 text-xs text-amber-400/80 leading-relaxed max-w-md mx-auto">
                Your paper is saved. Since this is in manual grading mode, your score and explanation sheet will become accessible once your tutor grades the exam.
              </p>
            </div>
          )}

          {/* Dashboard Visual Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Score Visual Progress Circular Ring */}
            <Card className="flex flex-col items-center justify-center p-6 text-center border-[#1e223c] bg-[#0c0e1a]/95">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-4">Total Score</span>
              
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG circular track */}
                <svg className="absolute w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="62" strokeWidth="8" stroke="rgba(30, 34, 60, 0.5)" fill="transparent" />
                  <circle 
                    cx="72" 
                    cy="72" 
                    r="62" 
                    strokeWidth="8" 
                    stroke="url(#cyanPurpleGrad)" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 62}
                    strokeDashoffset={2 * Math.PI * 62 * (1 - scoreProgressPercent / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="cyanPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-center z-10">
                  <p className="text-3xl font-black text-white">{pendingManualGrade ? "—" : data.total_score?.toFixed(1) ?? "—"}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">points</p>
                </div>
              </div>

              {!pendingManualGrade && data.rank_in_batch != null && (
                <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1 text-xs font-bold text-amber-400">
                  <Award className="w-3.5 h-3.5" />
                  <span>Batch Rank: #{data.rank_in_batch}</span>
                </div>
              )}
            </Card>

            {/* Accuracy Visual Progress Ring */}
            <Card className="flex flex-col items-center justify-center p-6 text-center border-[#1e223c] bg-[#0c0e1a]/95">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-4">Exam Accuracy</span>
              
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="absolute w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="62" strokeWidth="8" stroke="rgba(30, 34, 60, 0.5)" fill="transparent" />
                  <circle 
                    cx="72" 
                    cy="72" 
                    r="62" 
                    strokeWidth="8" 
                    stroke="#10b981" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 62}
                    strokeDashoffset={2 * Math.PI * 62 * (1 - (pendingManualGrade ? 0 : accuracyPercent) / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="text-center z-10">
                  <p className="text-3xl font-black text-white">{pendingManualGrade ? "—" : `${accuracyPercent}%`}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Accuracy</p>
                </div>
              </div>

              <span className="mt-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {correctCount} correct of {correctCount + wrongCount} answered
              </span>
            </Card>

            {/* General metrics dashboard */}
            <div className="grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center flex flex-col justify-center shadow-lg backdrop-blur-md">
                <div className="text-2xl font-black text-emerald-400">{pendingManualGrade ? "—" : correctCount}</div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-500/80 mt-1">Correct answers</div>
              </div>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-center flex flex-col justify-center shadow-lg backdrop-blur-md">
                <div className="text-2xl font-black text-red-400">{pendingManualGrade ? "—" : wrongCount}</div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-red-500/80 mt-1">Wrong answers</div>
              </div>
              <div className="rounded-2xl border border-slate-500/20 bg-slate-500/5 p-5 text-center flex flex-col justify-center shadow-lg backdrop-blur-md">
                <div className="text-2xl font-black text-slate-400">{skippedCount}</div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500/80 mt-1">Skipped / Unanswered</div>
              </div>
            </div>

          </div>

          {/* Subject Analysis Breakdown */}
          {data.subject_breakdown && !pendingManualGrade && (
            <div className="mb-8 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 px-1">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>Subject Analysis Breakdown</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(data.subject_breakdown).map(([subject, stat]) => {
                  const subjectTotal = stat.correct + stat.wrong + stat.skipped;
                  const subjectScorePercent = subjectTotal > 0 ? Math.min(100, Math.round((stat.score / subjectTotal) * 100)) : 0;
                  return (
                    <Card key={subject} className="hover:border-slate-800 transition-all duration-300 bg-[#0c0e1a]/95">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold capitalize text-white tracking-tight flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                          {formatSubjectName(subject)}
                        </h3>
                        <span className="text-sm font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg">
                          {stat.score.toFixed(1)} pts
                        </span>
                      </div>

                      {/* Clean Progress Bar */}
                      <div className="mt-4 w-full bg-[#1e223c]/40 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-purple-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${subjectScorePercent}%` }}
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 border-t border-[#1e223c]/60 pt-3">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{stat.correct} Correct</span>
                        </span>
                        <span className="text-red-400 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{stat.wrong} Wrong</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>{stat.skipped} Skipped</span>
                        </span>
                      </div>
                    </Card>
                  );
                })}
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
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 py-4.5 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-cyan-500/10 cursor-pointer transition-all duration-300 flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>
                {answersRevealed
                  ? "Review Detailed Explanations"
                  : "Review Your Answers"}
              </span>
            </motion.button>
          )}
        </main>
      </div>
      <MobileNav />
    </AuthGuard>
  );
}
