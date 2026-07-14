"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Check, X, Loader2, User, FileText, ArrowLeft } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Question {
  question_id: string;
  stem: string;
  options: Record<string, string>;
  selected_option: string | null;
  correct_option: string;
  explanation: string | null;
  is_correct: boolean | null;
}

interface AttemptDetail {
  attempt_id: string;
  student_name: string;
  test_title: string;
  submitted_at: string | null;
  questions: Question[];
  total_score: number | null;
}

export default function GradeAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attempt_id as string;

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const [grades, setGrades] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Fetch attempt details for manual grading
    // We need to get the attempt result with review
    apiFetch<any>(`/api/tests/attempts/${attemptId}/result`)
      .then((data) => {
        setAttempt({
          attempt_id: data.attempt_id,
          student_name: "Student", // Will need to fetch from separate endpoint or include in response
          test_title: "Test", // Will need to fetch from separate endpoint or include in response
          submitted_at: null,
          questions: data.review || [],
          total_score: data.total_score,
        });
        // Initialize grades from existing is_correct values
        const initialGrades: Record<string, boolean> = {};
        data.review?.forEach((q: Question) => {
          if (q.is_correct !== null) {
            initialGrades[q.question_id] = q.is_correct;
          }
        });
        setGrades(initialGrades);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [attemptId]);

  const handleGrade = (questionId: string, isCorrect: boolean) => {
    setGrades((prev) => ({ ...prev, [questionId]: isCorrect }));
  };

  const handleSubmitGrading = async () => {
    setGrading(true);
    setError(null);

    try {
      const updates = Object.entries(grades).map(([questionId, isCorrect]) => ({
        question_id: questionId,
        is_correct: isCorrect,
      }));

      await apiFetch(`/api/tests/attempts/${attemptId}/manual-grade`, {
        method: "POST",
        body: JSON.stringify(updates),
      });

      router.push("/tutor/grading");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit grades");
    } finally {
      setGrading(false);
    }
  };

  const gradedCount = Object.keys(grades).length;
  const totalQuestions = attempt?.questions.length || 0;

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Grade Attempt">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        )}

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {!loading && !error && attempt && (
          <>
            <Card className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
                  <User className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Student Submission</h2>
                  <p className="text-xs text-zinc-500">{attempt.test_title}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">
                  Graded: {gradedCount}/{totalQuestions}
                </span>
                {attempt.total_score !== null && (
                  <span className="font-bold text-emerald-400">
                    Score: {attempt.total_score.toFixed(1)}
                  </span>
                )}
              </div>
            </Card>

            <div className="space-y-3 mb-4">
              {attempt.questions.map((q, index) => (
                <motion.div
                  key={q.question_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card>
                    <div className="mb-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-zinc-500">
                          Q{index + 1}
                        </span>
                        {q.selected_option && (
                          <span className="text-[10px] text-zinc-500">
                            Selected: {q.selected_option}
                          </span>
                        )}
                      </div>
                      <MarkdownRenderer content={q.stem} />
                    </div>

                    <div className="space-y-2 mb-3">
                      {Object.entries(q.options).map(([key, value]) => (
                        <div
                          key={key}
                          className={`rounded-lg border px-3 py-2 text-xs ${
                            q.selected_option === key
                              ? "border-cyan-500/50 bg-cyan-500/10"
                              : "border-[#2b3052] bg-[#16192b]/60"
                          }`}
                        >
                          <span className="font-bold text-zinc-400 mr-2">{key}:</span>
                          <span className="text-zinc-300">{value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleGrade(q.question_id, true)}
                        disabled={grading}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                          grades[q.question_id] === true
                            ? "bg-emerald-600 text-white"
                            : "border border-[#2b3052] bg-[#16192b] text-zinc-400 hover:bg-emerald-600/20 hover:border-emerald-500/50 hover:text-emerald-400"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Correct
                      </button>
                      <button
                        onClick={() => handleGrade(q.question_id, false)}
                        disabled={grading}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                          grades[q.question_id] === false
                            ? "bg-red-600 text-white"
                            : "border border-[#2b3052] bg-[#16192b] text-zinc-400 hover:bg-red-600/20 hover:border-red-500/50 hover:text-red-400"
                        }`}
                      >
                        <X className="h-3.5 w-3.5" />
                        Incorrect
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            <button
              onClick={handleSubmitGrading}
              disabled={grading || gradedCount === 0}
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {grading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Grades"
              )}
            </button>
          </>
        )}
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
