"use client";

import { use, useEffect, useState } from "react";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/Brand";

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
  const [data, setData] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  useEffect(() => {
    apiFetch<ResultData>(`/api/tests/attempts/${attempt_id}/result`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [attempt_id]);

  if (error) {
    return (
      <AuthGuard roles={["student", "parent"]}>
        <div className="flex min-h-screen items-center justify-center bg-[#0d0f1a] p-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </AuthGuard>
    );
  }

  if (!data) {
    return (
      <AuthGuard roles={["student", "parent"]}>
        <div className="flex min-h-screen items-center justify-center bg-[#0d0f1a] p-6">
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </AuthGuard>
    );
  }

  const maxScore = data.subject_breakdown
    ? Object.values(data.subject_breakdown).reduce(
        (sum, s) => sum + s.correct + s.wrong + s.skipped,
        0,
      )
    : 0;

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

  // Review mode
  if (showReview && data.review) {
    const item = data.review[reviewIndex];
    if (!item) {
      return (
        <AuthGuard roles={["student", "parent"]}>
          <div className="flex min-h-screen items-center justify-center bg-[#0d0f1a] p-6">
            <p className="text-sm text-zinc-400">No review data.</p>
          </div>
        </AuthGuard>
      );
    }

    const isLast = reviewIndex === data.review.length - 1;
    const userCorrect = item.is_correct === true;

    return (
      <AuthGuard roles={["student", "parent"]}>
        <div className="min-h-screen bg-[#0d0f1a] pb-24 safe-top safe-bottom">
          <header className="sticky top-0 z-20 border-b border-[#1e233d] bg-[#0d0f1a]/95 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-bold text-white">Review</h1>
              <button
                onClick={() => setShowReview(false)}
                className="text-xs text-cyan-400"
              >
                Summary
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.review.map((r, i) => {
                let cls =
                  "w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center border";
                if (r.is_correct === true)
                  cls += " bg-emerald-600/30 border-emerald-500 text-emerald-300";
                else if (r.is_correct === false)
                  cls += " bg-red-600/30 border-red-500 text-red-300";
                else
                  cls +=
                    " bg-[#16192b] border-[#2b3052] text-zinc-500";
                if (i === reviewIndex) cls += " ring-2 ring-cyan-400";
                return (
                  <button
                    key={r.question_id}
                    className={cls}
                    onClick={() => setReviewIndex(i)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </header>

          <main className="px-4 py-4">
            <p className="mb-4 text-sm leading-relaxed text-zinc-100">
              {item.stem}
            </p>
            <div className="space-y-2">
              {Object.entries(item.options).map(([key, value]) => {
                const isSelected = item.selected_option === key;
                const isCorrectAnswer = item.correct_option === key;
                let border = "border-[#2b3052]";
                let bg = "bg-[#16192b]";
                let text = "text-zinc-300";
                if (isCorrectAnswer) {
                  border = "border-emerald-500";
                  bg = "bg-emerald-600/20";
                  text = "text-emerald-300";
                } else if (isSelected && !item.is_correct) {
                  border = "border-red-500";
                  bg = "bg-red-600/20";
                  text = "text-red-300";
                }
                return (
                  <div
                    key={key}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${border} ${bg} ${text}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold border border-current">
                      {key}
                    </span>
                    <span className="flex-1">{value}</span>
                    {isCorrectAnswer && (
                      <span className="text-emerald-400">✓</span>
                    )}
                    {isSelected && !item.is_correct && (
                      <span className="text-red-400">✗</span>
                    )}
                  </div>
                );
              })}
            </div>
            {item.explanation && (
              <div className="mt-4 rounded-xl border border-[#2b3052] bg-[#16192b]/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Explanation
                </p>
                <p className="mt-1 text-sm text-zinc-300">
                  {item.explanation}
                </p>
              </div>
            )}
          </main>

          <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1e233d] bg-[#0d0f1a]/95 px-4 py-3 backdrop-blur-md safe-bottom">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setReviewIndex(Math.max(0, reviewIndex - 1))}
                disabled={reviewIndex === 0}
                className="rounded-xl bg-[#16192b] px-4 py-2.5 text-sm font-semibold text-zinc-300 disabled:opacity-30"
              >
                ← Prev
              </button>
              <div className="text-xs text-zinc-400">
                {userCorrect ? "Correct ✓" : item.is_correct === null ? "Skipped" : "Wrong ✗"}
              </div>
              {isLast ? (
                <button
                  onClick={() => setShowReview(false)}
                  className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white"
                >
                  Done
                </button>
              ) : (
                <button
                  onClick={() => setReviewIndex(reviewIndex + 1)}
                  className="rounded-xl bg-[#3d4193] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Next →
                </button>
              )}
            </div>
          </footer>
        </div>
      </AuthGuard>
    );
  }

  // Summary view
  return (
    <AuthGuard roles={["student", "parent"]}>
      <div className="min-h-screen bg-[#0d0f1a] pb-24 safe-top safe-bottom">
        <header className="sticky top-0 z-20 border-b border-[#1e233d] bg-[#0d0f1a]/95 px-4 py-3 backdrop-blur-md">
          <h1 className="text-lg font-bold text-white">Result</h1>
        </header>

        <main className="px-4 py-4">
          {/* Score card */}
          <Card className="mb-4 text-center">
            <p className="text-4xl font-black text-cyan-400">
              {data.total_score?.toFixed(1) ?? "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-400">Total Score</p>
            {data.rank_in_batch != null && (
              <div className="mt-2 inline-block rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
                Rank #{data.rank_in_batch}
              </div>
            )}
          </Card>

          {/* Stats grid */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-600/10 p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">
                {correctCount}
              </div>
              <div className="text-[10px] uppercase text-emerald-500/80">
                Correct
              </div>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-600/10 p-3 text-center">
              <div className="text-lg font-bold text-red-400">{wrongCount}</div>
              <div className="text-[10px] uppercase text-red-500/80">Wrong</div>
            </div>
            <div className="rounded-xl border border-zinc-500/30 bg-zinc-600/10 p-3 text-center">
              <div className="text-lg font-bold text-zinc-400">
                {skippedCount}
              </div>
              <div className="text-[10px] uppercase text-zinc-500/80">
                Skipped
              </div>
            </div>
          </div>

          {/* Subject breakdown */}
          {data.subject_breakdown && (
            <div className="mb-4 space-y-2">
              <h2 className="text-sm font-bold text-white">
                Subject Breakdown
              </h2>
              {Object.entries(data.subject_breakdown).map(
                ([subject, stat]) => (
                  <Card key={subject}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold capitalize text-white">
                        {subject.replace("_", " ")}
                      </h3>
                      <span className="text-sm font-bold text-cyan-400">
                        {stat.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-3 text-[11px] text-zinc-500">
                      <span className="text-emerald-400">
                        {stat.correct}C
                      </span>
                      <span className="text-red-400">{stat.wrong}W</span>
                      <span>{stat.skipped}S</span>
                    </div>
                  </Card>
                ),
              )}
            </div>
          )}

          {/* Review button */}
          {data.review && data.review.length > 0 && (
            <button
              onClick={() => {
                setReviewIndex(0);
                setShowReview(true);
              }}
              className="w-full rounded-xl bg-[#3d4193] py-3.5 text-sm font-semibold text-white"
            >
              Review Answers
            </button>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
