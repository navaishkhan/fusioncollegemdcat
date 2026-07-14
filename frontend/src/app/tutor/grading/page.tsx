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
            <div className="text-sm text-zinc-500">Loading...</div>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!loading && !error && (
          <div className="space-y-3">
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-emerald-500/50 mb-3" />
                <p className="text-sm text-zinc-500">No pending submissions to grade</p>
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
                    className="cursor-pointer hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                        <Clock className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3.5 w-3.5 text-zinc-500" />
                          <h3 className="text-sm font-semibold text-white">
                            {item.student_name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-3.5 w-3.5 text-zinc-500" />
                          <p className="text-xs text-zinc-400 truncate">{item.test_title}</p>
                        </div>
                        {item.submitted_at && (
                          <p className="text-[10px] text-zinc-500">
                            Submitted {new Date(item.submitted_at).toLocaleString()}
                          </p>
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
