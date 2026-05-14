"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  auditId: string;
  onComplete: () => void;
}

const STEPS = [
  { threshold: 5, label: "Starting crawl…" },
  { threshold: 30, label: "Crawling pages…" },
  { threshold: 55, label: "Running technical audits…" },
  { threshold: 75, label: "Generating AI analysis…" },
  { threshold: 95, label: "Compiling report…" },
];

export default function AuditProgressTracker({ auditId, onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/audits/${auditId}/status`);
        if (!res.ok) return;

        const data = await res.json() as {
          status: string;
          progress: number;
          errorMessage?: string;
        };

        setStatus(data.status);
        setProgress(data.progress);

        if (data.status === "COMPLETED") {
          onComplete();
          return;
        }

        if (data.status === "FAILED") {
          setError(data.errorMessage ?? "Audit failed. Please try again.");
          return;
        }
      } catch {
        // Network error — keep polling
      }
    };

    const interval = setInterval(poll, 3000);
    poll(); // immediate first check

    return () => clearInterval(interval);
  }, [auditId, onComplete]);

  const currentStep = STEPS.findLast((s) => progress >= s.threshold) ?? STEPS[0];

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm font-medium text-red-400">{error}</p>
      </div>
    );
  }

  if (status === "COMPLETED") {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <p className="text-sm font-medium text-white/60">Audit complete! Loading results…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <Loader2 className="h-10 w-10 animate-spin text-white/40" />
      <div className="w-full max-w-sm space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/40">{currentStep?.label}</span>
          <span className="font-bold text-white">{progress}%</span>
        </div>
        <div className="h-px w-full overflow-hidden bg-white/10">
          <motion.div
            className="h-px bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
      <p className="text-xs tracking-widest uppercase text-white/20">This may take 1–3 minutes depending on site size</p>
    </div>
  );
}
