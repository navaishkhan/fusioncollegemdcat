"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch, formatSubjectName } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, User, MessageSquare, Loader2 } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface PendingReview {
  id: string;
  student_name: string;
  question_stem: string;
  question_subject: string;
  reason: string;
  created_at: string;
}

export default function QuestionReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchReviews = () => {
    setLoading(true);
    apiFetch<PendingReview[]>("/api/questions/reviews/pending")
      .then(setReviews)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleResolve = async (reviewId: string, status: "resolved" | "rejected") => {
    setResolvingId(reviewId);
    setError(null);
    try {
      await apiFetch(`/api/questions/reviews/${reviewId}?status=${status}`, {
        method: "PATCH",
      });
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update review");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Question Reviews">
        <p className="mb-4 text-xs text-zinc-400">
          Students can dispute questions after viewing results. Resolve or reject each request.
        </p>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {!loading && !error && reviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-emerald-500/50 mb-3" />
            <p className="text-sm text-zinc-500">No pending question review requests</p>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence>
            {reviews.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                      <MessageSquare className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-sm font-semibold text-white">{item.student_name}</span>
                        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-violet-300">
                          {formatSubjectName(item.question_subject)}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 rounded-xl border border-[#2b3052] bg-[#16192b]/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Question
                    </p>
                    <div className="text-xs text-zinc-300 line-clamp-3">
                      <MarkdownRenderer content={item.question_stem} />
                    </div>
                  </div>

                  <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80 mb-1">
                      Student&apos;s Reason
                    </p>
                    <p className="text-xs text-zinc-300 leading-relaxed">{item.reason}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve(item.id, "resolved")}
                      disabled={resolvingId === item.id}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Resolve
                    </button>
                    <button
                      onClick={() => handleResolve(item.id, "rejected")}
                      disabled={resolvingId === item.id}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-bold text-red-400 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button
          onClick={() => router.push("/tutor")}
          className="mt-6 w-full rounded-xl border border-[#2b3052] py-3 text-xs font-bold uppercase text-zinc-400 hover:text-white transition-colors"
        >
          Back to Dashboard
        </button>
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
