"use client";

import Link from "next/link";
import { formatDate, truncateUrl, scoreColor } from "@/lib/utils/helpers";
import { ExternalLink, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

type AuditRow = {
  id: string;
  url: string;
  status: string;
  createdAt: Date | string;
  scores?: { overall: number } | null;
  _count: { issues: number; pages: number };
};

interface Props {
  audits: AuditRow[];
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  FAILED: <XCircle className="h-4 w-4 text-red-400" />,
  PENDING: <Clock className="h-4 w-4 text-white/30" />,
  CRAWLING: <Loader2 className="h-4 w-4 animate-spin text-white/60" />,
  ANALYZING: <Loader2 className="h-4 w-4 animate-spin text-white/60" />,
  GENERATING_REPORT: <Loader2 className="h-4 w-4 animate-spin text-white/60" />,
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Completed",
  FAILED: "Failed",
  PENDING: "Pending",
  CRAWLING: "Crawling…",
  ANALYZING: "Analysing…",
  GENERATING_REPORT: "Generating report…",
};

export default function AuditHistoryTable({ audits }: Props) {
  if (audits.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm text-white/50">No audits yet. Start one above!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-black">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-white/50">
              URL
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-white/50">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-white/50">
              Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-white/50">
              Issues
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-white/50">
              Pages
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-white/50">
              Date
            </th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {audits.map((audit) => (
            <tr key={audit.id} className="hover:bg-white/5 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="max-w-[220px] truncate text-sm font-medium text-white">
                    {truncateUrl(audit.url, 40)}
                  </span>
                  <a
                    href={audit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-white/20 hover:text-white/60"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1.5">
                  {STATUS_ICON[audit.status]}
                  <span className="text-sm text-white/50">
                    {STATUS_LABEL[audit.status] ?? audit.status}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                {audit.scores ? (
                  <span
                    className={`text-sm font-bold ${scoreColor(audit.scores.overall)}`}
                  >
                    {audit.scores.overall}/100
                  </span>
                ) : (
                  <span className="text-sm text-white/20">—</span>
                )}
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-white/60">{audit._count.issues}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-white/60">{audit._count.pages}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-white/70">{formatDate(audit.createdAt)}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <Link
                  href={`/audits/${audit.id}`}
                  className="text-xs font-bold tracking-widest uppercase text-white hover:text-white/60 transition-colors"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
