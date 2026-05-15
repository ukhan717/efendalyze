"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { severityColor, categoryColor } from "@/lib/utils/helpers";
import type { AuditIssue } from "@prisma/client";

interface Props {
  issue: AuditIssue;
}

const EFFORT_LABELS = { low: "Low effort", medium: "Medium effort", high: "High effort" };

export default function IssueCard({ issue }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-white/10 bg-white/5 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors"
      >
        <span
          className={`mt-0.5 flex-shrink-0 border px-2 py-0.5 text-xs font-bold tracking-widest uppercase ${severityColor(issue.severity)}`}
        >
          {issue.severity}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-white">{issue.title}</span>
            <span className={`px-1.5 py-0.5 text-xs tracking-wide ${categoryColor(issue.category)}`}>
              {issue.category.replace("_", "/")}
            </span>
            {issue.aiGenerated && (
              <span className="border border-white/20 px-1.5 py-0.5 text-xs text-white/50">
                AI
              </span>
            )}
            {issue.effort && (
              <span className="text-xs text-white/30">
                {EFFORT_LABELS[issue.effort as keyof typeof EFFORT_LABELS] ?? issue.effort}
              </span>
            )}
          </div>
          {!expanded && (
            <p className="mt-0.5 truncate text-xs text-white/40">{issue.description}</p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/30" />
        ) : (
          <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/30" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Description</p>
            <p className="mt-1 text-sm text-white/70 leading-relaxed">{issue.description}</p>
          </div>

          <div className="border border-white/20 bg-white/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
              Recommendation
            </p>
            <p className="mt-1 text-sm text-white leading-relaxed">{issue.recommendation}</p>
          </div>

          {issue.wcagCriteria && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30">WCAG Reference</p>
              <p className="mt-0.5 text-xs text-white/50">{issue.wcagCriteria}</p>
            </div>
          )}

          {issue.impact && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Business Impact</p>
              <p className="mt-0.5 text-xs text-white/50">{issue.impact}</p>
            </div>
          )}

          {issue.element && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Element</p>
              <code className="mt-0.5 block truncate border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-white/60">
                {issue.element}
              </code>
            </div>
          )}


        </div>
      )}
    </div>
  );
}
