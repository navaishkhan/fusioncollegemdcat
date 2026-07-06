"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { apiFetch, getStoredUser } from "@/lib/api";

interface QuestionData {
  id: string;
  subject: string;
  topic: string;
  stem: string;
  options: Record<string, string>;
}

interface StartResponse {
  attempt_id: string;
  server_deadline_at: string;
  questions: QuestionData[];
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

  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Save answers periodically
  const saveAnswers = useCallback(async () => {
    if (!attemptId) return;
    const draft = answersRef.current;
    const updates = Object.entries(draft)
      .filter(([, v]) => v.selected_option || v.marked_for_review)
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

  // Timer tick
  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        handleSubmit();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  // Auto-save every 30s
  useEffect(() => {
    if (pageState !== "exam") return;
    saveTimerRef.current = setInterval(saveAnswers, 30000);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [pageState, saveAnswers]);

  // Warn on tab switch
  useEffect(() => {
    if (pageState !== "exam") return;
    const handler = () => {
      // Could log to server, just a deterrent
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [pageState]);

  // Clean save on close/unload
  useEffect(() => {
    if (pageState !== "exam") return;
    const handler = () => {
      // Use sendBeacon for reliability
      const draft = answersRef.current;
      const updates = Object.entries(draft)
        .filter(([, v]) => v.selected_option || v.marked_for_review)
        .map(([qid, v]) => ({
          question_id: qid,
          selected_option: v.selected_option,
          marked_for_review: v.marked_for_review,
        }));
      if (updates.length > 0) {
        navigator.sendBeacon(
          `/api/tests/attempts/${attemptId}/answers`,
          JSON.stringify(updates),
        );
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
      const initial: Record<string, AnswerDraft> = {};
      data.questions.forEach((q) => {
        initial[q.id] = { selected_option: null, marked_for_review: false };
      });
      setAnswers(initial);
      setPageState("exam");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start test");
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId || pageState === "submitting" || pageState === "done") return;
    setPageState("submitting");
    // Save remaining answers first
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
  };

  const selectOption = (qid: string, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], selected_option: option },
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

  const currentQ = questions[currentIndex];
  const currentA = currentQ ? answers[currentQ.id] : null;
  const answeredCount = Object.values(answers).filter(
    (a) => a.selected_option !== null,
  ).length;
  const reviewCount = Object.values(answers).filter(
    (a) => a.marked_for_review,
  ).length;

  // Confirm screen
  if (pageState === "confirm") {
    return (
      <AuthGuard roles={["student"]}>
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0f1a] p-6">
          <h1 className="text-xl font-bold text-white">Ready to start?</h1>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Make sure you have a stable internet connection.
            <br />
            The timer starts once you tap begin.
          </p>
          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
          <button
            onClick={startTest}
            disabled={starting}
            className="mt-6 w-full max-w-xs rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {starting ? "Starting..." : "Begin Test"}
          </button>
          <button
            onClick={() => router.back()}
            className="mt-3 text-sm text-zinc-500"
          >
            Cancel
          </button>
        </div>
      </AuthGuard>
    );
  }

  // Done screen
  if (pageState === "done") {
    return (
      <AuthGuard roles={["student"]}>
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0f1a] p-6">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="text-xl font-bold text-white">Test Submitted!</h1>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Your answers have been recorded and graded.
          </p>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {resultUrl && (
            <button
              onClick={() => router.push(resultUrl)}
              className="mt-6 w-full max-w-xs rounded-xl bg-cyan-600 py-3.5 text-sm font-bold text-white"
            >
              View Results
            </button>
          )}
          <button
            onClick={() => router.push("/student")}
            className="mt-3 text-sm text-zinc-500"
          >
            Back to Dashboard
          </button>
        </div>
      </AuthGuard>
    );
  }

  // Submitting screen
  if (pageState === "submitting") {
    return (
      <AuthGuard roles={["student"]}>
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0f1a] p-6">
          <p className="text-lg text-white">Submitting...</p>
        </div>
      </AuthGuard>
    );
  }

  // Exam UI
  const isLast = currentIndex === questions.length - 1;

  return (
    <AuthGuard roles={["student"]}>
      <div className="flex min-h-screen flex-col bg-[#0d0f1a] pt-2 safe-top">
        {/* Top bar: timer + progress */}
        <header className="sticky top-0 z-20 border-b border-[#1e233d] bg-[#0d0f1a]/95 px-4 py-2 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-400">
              {currentIndex + 1}/{questions.length}
            </div>
            <div
              className={`text-sm font-bold tabular-nums ${
                timeLeft !== null && timeLeft < 120
                  ? "text-red-400 animate-pulse"
                  : "text-cyan-400"
              }`}
            >
              {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
            </div>
            <div className="text-xs text-zinc-400">
              {answeredCount} done
            </div>
          </div>
          {/* Question palette */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {questions.map((q, i) => {
              const a = answers[q.id];
              let cls =
                "w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center border transition-colors";
              if (a?.selected_option) {
                cls += " bg-emerald-600/30 border-emerald-500 text-emerald-300";
              } else if (a?.marked_for_review) {
                cls += " bg-amber-600/30 border-amber-500 text-amber-300";
              } else {
                cls += " bg-[#16192b] border-[#2b3052] text-zinc-500";
              }
              if (i === currentIndex) {
                cls += " ring-2 ring-cyan-400";
              }
              return (
                <button key={q.id} className={cls} onClick={() => setCurrentIndex(i)}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          {reviewCount > 0 && (
            <div className="mt-1 text-[11px] text-amber-400">
              {reviewCount} marked for review
            </div>
          )}
        </header>

        {/* Question area */}
        <main className="flex-1 px-4 py-4 pb-28">
          {currentQ && (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-300">
                  {currentQ.subject}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {currentQ.topic}
                </span>
                {currentA?.marked_for_review && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    REVIEW
                  </span>
                )}
              </div>
              <p className="mb-4 text-sm leading-relaxed text-zinc-100">
                {currentQ.stem}
              </p>
              <div className="space-y-2">
                {Object.entries(currentQ.options).map(([key, value]) => {
                  const selected = currentA?.selected_option === key;
                  return (
                    <button
                      key={key}
                      onClick={() => selectOption(currentQ.id, key)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                        selected
                          ? "border-cyan-500 bg-cyan-600/20 text-white"
                          : "border-[#2b3052] bg-[#16192b] text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          selected
                            ? "bg-cyan-500 text-white"
                            : "border border-[#2b3052] text-zinc-500"
                        }`}
                      >
                        {key}
                      </span>
                      <span className="flex-1">{value}</span>
                    </button>
                  );
                })}
              </div>
              {error && (
                <p className="mt-3 text-sm text-red-400">{error}</p>
              )}
            </div>
          )}
        </main>

        {/* Bottom bar */}
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1e233d] bg-[#0d0f1a]/95 px-4 py-3 backdrop-blur-md safe-bottom">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="rounded-xl bg-[#16192b] px-4 py-2.5 text-sm font-semibold text-zinc-300 disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => toggleReview(currentQ.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                currentA?.marked_for_review
                  ? "bg-amber-600/30 text-amber-300"
                  : "bg-[#16192b] text-zinc-300"
              }`}
            >
              {currentA?.marked_for_review ? "Unmark" : "Review ↻"}
            </button>
            {isLast ? (
              <button
                onClick={handleSubmit}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white"
              >
                Submit
              </button>
            ) : (
              <button
                onClick={() =>
                  setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))
                }
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
