"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileNav, { AuthGuard } from "@/components/MobileNav";
import { Card, PageShell } from "@/components/Brand";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { CheckCircle, Clock, User, FileText } from "lucide-react";

interface PendingAttempt {
  attempt_id: string;
  student_name: string;
  test_title: string;
  submitted_at: string | null;
}

export default function ManualGradingPage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PendingAttempt[]>("/api/tests/pending-manual-grading")
      .then(setPending)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard roles={["admin", "tutor"]}>
      <PageShell title="Manual Grading">
        <div className="mb-4">
          <p className="text-xs text-zinc-400">
            Tests with manual marking mode require teacher review
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!loading && !error && (
          <div className="space-y-3">
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl glossy-border">
                <CheckCircle className="h-12 w-12 text-emerald-400/60 mb-3 animate-pulse" />
                <p className="text-sm font-semibold text-zinc-400">No pending submissions to grade</p>
              </div>
            ) : (
              pending.map((item, index) => (
                <motion.div
                  key={item.attempt_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    onClick={() => router.push(`/tutor/grading/${item.attempt_id}`)}
                    className="cursor-pointer hover:border-cyan-500/50 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                        <Clock className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <User className="h-4 w-4 text-cyan-400 shrink-0" />
                          <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {item.student_name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                          <p className="text-xs text-zinc-400 truncate font-medium">{item.test_title}</p>
                        </div>
                        {item.submitted_at && (
                          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                            Submitted {new Date(item.submitted_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}
      </PageShell>
      <MobileNav />
    </AuthGuard>
  );
}
