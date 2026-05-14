"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  Download, ExternalLink, FileText, Layers,
} from "lucide-react";
import type { Audit, AuditPage, AuditIssue, AuditScore, AuditReport } from "@prisma/client";
import AuditProgressTracker from "./audit-progress-tracker";
import IssueCard from "./issue-card";
import { scoreColor, scoreBgColor, severityColor, categoryColor, formatDate, truncateUrl } from "@/lib/utils/helpers";

type FullAudit = Audit & {
  pages: AuditPage[];
  issues: AuditIssue[];
  scores: AuditScore | null;
  report: AuditReport | null;
};

const SCORE_CATEGORIES = [
  { key: "seo", label: "SEO" },
  { key: "accessibility", label: "Accessibility" },
  { key: "performance", label: "Performance" },
  { key: "uxUi", label: "UX/UI" },
  { key: "content", label: "Content" },
  { key: "trust", label: "Trust" },
  { key: "mobile", label: "Mobile" },
];

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };

export default function AuditDetailView({ audit }: { audit: FullAudit }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "issues" | "pages" | "report">("overview");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [exportingPdf, setExportingPdf] = useState(false);

  const isInProgress = !["COMPLETED", "FAILED"].includes(audit.status);

  const handleComplete = useCallback(() => {
    router.refresh();
  }, [router]);

  const filteredIssues = audit.issues
    .filter((i) => severityFilter === "ALL" || i.severity === severityFilter)
    .filter((i) => categoryFilter === "ALL" || i.category === categoryFilter)
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] ?? 5) -
        (SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER] ?? 5)
    );

  const categories = [...new Set(audit.issues.map((i) => i.category))];

  const chartData = SCORE_CATEGORIES.map(({ key, label }) => ({
    name: label,
    score: audit.scores?.[key as keyof AuditScore] as number ?? 0,
  }));

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      // Dynamically import to keep bundle small
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // ── Title page ──────────────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.text("EFENDY PARTNERS", 20, 25);

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text("Website Audit Report", 20, 35);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`URL: ${audit.url}`, 20, 45);
      doc.text(`Date: ${formatDate(audit.createdAt)}`, 20, 53);
      doc.text(`Overall Score: ${audit.scores?.overall ?? "N/A"}/100`, 20, 61);

      // ── Scores ───────────────────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text("Category Scores", 20, 82);

      let y = 90;
      for (const { key, label } of SCORE_CATEGORIES) {
        const score = (audit.scores?.[key as keyof AuditScore] as number) ?? 0;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(`${label}: ${score}/100`, 20, y);
        // Bar
        doc.setFillColor(229, 231, 235);
        doc.rect(60, y - 3.5, 80, 3, "F");
        const barColor = score >= 80 ? [16, 185, 129] : score >= 60 ? [245, 158, 11] : [239, 68, 68];
        doc.setFillColor(barColor[0], barColor[1], barColor[2]);
        doc.rect(60, y - 3.5, (score / 100) * 80, 3, "F");
        y += 8;
      }

      // ── Executive Summary ─────────────────────────────────────────────
      if (audit.report?.executiveSummary) {
        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        doc.text("Executive Summary", 20, 25);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const summaryLines = doc.splitTextToSize(audit.report.executiveSummary, 170);
        doc.text(summaryLines, 20, 35);
      }

      // ── Top Issues ────────────────────────────────────────────────────
      const topIssues = audit.issues.filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH").slice(0, 15);
      if (topIssues.length > 0) {
        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        doc.text("Critical & High Priority Issues", 20, 25);

        let iy = 35;
        for (const issue of topIssues) {
          if (iy > 260) { doc.addPage(); iy = 25; }
          const svColor = issue.severity === "CRITICAL" ? [220, 38, 38] : [234, 88, 12];
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(svColor[0], svColor[1], svColor[2]);
          doc.text(`[${issue.severity}] ${issue.title}`, 20, iy);
          iy += 5;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60, 60, 60);
          const descLines = doc.splitTextToSize(issue.description, 170);
          doc.text(descLines, 20, iy);
          iy += descLines.length * 4 + 3;
          const recLines = doc.splitTextToSize(`Fix: ${issue.recommendation}`, 170);
          doc.setTextColor(100, 100, 100);
          doc.text(recLines, 20, iy);
          iy += recLines.length * 4 + 6;
        }
      }

      doc.save(`efendalyze-audit-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <span className="max-w-lg truncate">{truncateUrl(audit.url, 60)}</span>
            <a href={audit.url} target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/60">
              <ExternalLink className="h-4 w-4" />
            </a>
          </h1>
          <p className="mt-1 text-sm text-white/30">Started {formatDate(audit.createdAt)}</p>
        </div>
        {audit.status === "COMPLETED" && (
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 bg-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase text-black hover:bg-white/90 disabled:opacity-40 transition-colors"
          >
            <Download className="h-4 w-4" />
            {exportingPdf ? "Exporting…" : "Export PDF"}
          </button>
        )}
      </div>

      {/* Progress tracker for in-progress audits */}
      {isInProgress && (
        <div className="border border-white/10 bg-white/5 p-6">
          <AuditProgressTracker auditId={audit.id} onComplete={handleComplete} />
        </div>
      )}

      {/* Completed audit content */}
      {audit.status === "COMPLETED" && audit.scores && (
        <>
          {/* Overall score card */}
          <div className="grid gap-4 sm:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-1 flex flex-col items-center justify-center border border-white/10 bg-white/5 p-6"
            >
              <div className={`text-5xl font-extrabold ${scoreColor(audit.scores.overall)}`}>
                {audit.scores.overall}
              </div>
              <div className="mt-1 text-xs font-medium tracking-widest uppercase text-white/40">Overall Score</div>
              <div className="mt-3 text-xs text-white/20">out of 100</div>
            </motion.div>

            <div className="sm:col-span-3 border border-white/10 bg-white/5 p-6">
              <h3 className="mb-4 text-xs font-semibold tracking-widest uppercase text-white/40">Category breakdown</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barSize={22}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                  <Tooltip
                    formatter={(v: number) => [`${v}/100`, "Score"]}
                    contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "#fff" }}
                  />
                  <Bar dataKey="score" radius={[0, 0, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.score >= 80 ? "#10b981" : entry.score >= 60 ? "#f59e0b" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick wins & critical issues */}
          {((audit.scores.quickWins as string[])?.length > 0 || (audit.scores.criticalIssues as string[])?.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(audit.scores.criticalIssues as string[])?.length > 0 && (
                <div className="border border-red-500/20 bg-red-500/5 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-xs font-bold tracking-widest uppercase text-red-400">Critical Issues</span>
                  </div>
                  <ul className="space-y-1.5">
                    {(audit.scores.criticalIssues as string[]).map((item: string, i: number) => (
                      <li key={`critical-${i}`} className="text-xs text-red-400/80">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(audit.scores.quickWins as string[])?.length > 0 && (
                <div className="border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold tracking-widest uppercase text-emerald-400">Quick Wins</span>
                  </div>
                  <ul className="space-y-1.5">
                    {(audit.scores.quickWins as string[]).map((item: string, i: number) => (
                      <li key={`quickwin-${i}`} className="text-xs text-emerald-400/80">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="border border-white/10 bg-white/5">
            <div className="flex border-b border-white/10">
              {(["overview", "issues", "pages", "report"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-3 text-xs font-bold tracking-widest uppercase transition-colors border-b-2 ${
                    activeTab === tab
                      ? "border-white text-white"
                      : "border-transparent text-white/30 hover:text-white/60"
                  }`}
                >
                  {tab === "overview" && <Layers className="inline h-3.5 w-3.5 mr-1" />}
                  {tab === "issues" && <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />}
                  {tab === "pages" && <ExternalLink className="inline h-3.5 w-3.5 mr-1" />}
                  {tab === "report" && <FileText className="inline h-3.5 w-3.5 mr-1" />}
                  {tab}
                  {tab === "issues" && ` (${audit.issues.length})`}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6">
              {/* Overview tab */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Score grid */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {SCORE_CATEGORIES.map(({ key, label }) => {
                      const score = (audit.scores?.[key as keyof AuditScore] as number) ?? 0;
                      return (
                        <div key={key} className="border border-white/10 bg-black p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium tracking-widest uppercase text-white/40">{label}</span>
                            <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}</span>
                          </div>
                          <div className="h-px w-full bg-white/10">
                            <div
                              className={`h-px ${scoreBgColor(score)} transition-all`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Issue summary by category */}
                  <div>
                    <h3 className="mb-3 text-xs font-semibold tracking-widest uppercase text-white/40">Issues by category</h3>
                    <div className="space-y-2">
                      {categories.map((cat) => {
                        const catIssues = audit.issues.filter((i) => i.category === cat);
                        const critical = catIssues.filter((i) => i.severity === "CRITICAL").length;
                        const high = catIssues.filter((i) => i.severity === "HIGH").length;
                        return (
                          <div key={cat} className="flex items-center justify-between border border-white/10 bg-black px-4 py-2.5">
                            <span className={`px-2 py-0.5 text-xs font-medium tracking-wide ${categoryColor(cat)}`}>
                              {cat.replace("_", "/")}
                            </span>
                            <div className="flex items-center gap-2">
                              {critical > 0 && (
                                <span className="border border-red-500/30 px-2 py-0.5 text-xs font-medium text-red-400">
                                  {critical} critical
                                </span>
                              )}
                              {high > 0 && (
                                <span className="border border-orange-500/30 px-2 py-0.5 text-xs font-medium text-orange-400">
                                  {high} high
                                </span>
                              )}
                              <span className="text-xs text-white/30">{catIssues.length} total</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Issues tab */}
              {activeTab === "issues" && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="border border-white/10 bg-black px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                    >
                      <option value="ALL" className="bg-black text-white">All severities</option>
                      {["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map((s) => (
                        <option key={s} value={s} className="bg-black text-white">{s}</option>
                      ))}
                    </select>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="border border-white/10 bg-black px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                    >
                      <option value="ALL" className="bg-black text-white">All categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c} className="bg-black text-white">{c}</option>
                      ))}
                    </select>
                    <span className="ml-auto text-xs text-white/30 self-center">
                      {filteredIssues.length} issue{filteredIssues.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Issue list */}
                  <div className="space-y-3">
                    {filteredIssues.map((issue) => (
                      <IssueCard key={issue.id} issue={issue} />
                    ))}
                    {filteredIssues.length === 0 && (
                      <p className="py-8 text-center text-sm text-white/30">
                        No issues match the current filters.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Pages tab */}
              {activeTab === "pages" && (
                <div className="space-y-3">
                  {audit.pages.map((page) => (
                    <div key={page.id} className="border border-white/10 bg-black p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-bold ${
                              page.statusCode && page.statusCode < 300
                                ? "text-emerald-400 border border-emerald-500/30"
                                : page.statusCode && page.statusCode < 400
                                ? "text-amber-400 border border-amber-500/30"
                                : "text-red-400 border border-red-500/30"
                            }`}>
                              {page.statusCode ?? "?"}
                            </span>
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-sm font-medium text-white hover:text-white/60"
                            >
                              {truncateUrl(page.url, 70)}
                            </a>
                          </div>
                          {page.title && (
                            <p className="mt-1 text-xs text-white/30">{page.title}</p>
                          )}
                        </div>
                        <div className="flex gap-4 text-right text-xs text-white/30 flex-shrink-0">
                          <div>
                            <div className="font-medium text-white/60">{page.loadTimeMs}ms</div>
                            <div>Load time</div>
                          </div>
                          <div>
                            <div className="font-medium text-white/60">{page.wordCount}</div>
                            <div>Words</div>
                          </div>
                        </div>
                      </div>

                      {/* Screenshots */}
                      {(page.screenshotDesktop || page.screenshotMobile) && (
                        <div className="mt-3 flex gap-3 overflow-x-auto">
                          {page.screenshotDesktop && (
                            <div className="flex-shrink-0">
                              <p className="mb-1 text-xs text-white/20">Desktop</p>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={page.screenshotDesktop}
                                alt="Desktop screenshot"
                                className="h-24 w-auto border border-white/10 object-cover"
                              />
                            </div>
                          )}
                          {page.screenshotMobile && (
                            <div className="flex-shrink-0">
                              <p className="mb-1 text-xs text-white/20">Mobile</p>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={page.screenshotMobile}
                                alt="Mobile screenshot"
                                className="h-24 w-auto border border-white/10 object-cover"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Report tab */}
              {activeTab === "report" && audit.report && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">Executive Summary</h2>
                    <p className="mt-2 text-sm text-white/70 leading-relaxed whitespace-pre-line">
                      {audit.report.executiveSummary}
                    </p>
                  </div>

                  <div>
                    <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">Methodology</h2>
                    <p className="mt-2 text-sm text-white/70 leading-relaxed">
                      {audit.report.methodology}
                    </p>
                  </div>

                  {/* AI Insights */}
                  {audit.report.aiInsights && (() => {
                    const insights = audit.report.aiInsights as {
                      uxCritique: string;
                      contentAnalysis: string;
                      trustAnalysis: string;
                      overallAssessment: string;
                      topPriorities: string[];
                    };
                    return (
                      <div className="border border-white/20 bg-white/5 p-5">
                        <h2 className="text-xs font-bold tracking-widest uppercase text-white/60">AI Assessment</h2>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          {[
                            ["UX/UI", insights.uxCritique],
                            ["Content", insights.contentAnalysis],
                            ["Trust", insights.trustAnalysis],
                          ].map(([label, text]) => (
                            <div key={label}>
                              <p className="text-xs font-semibold tracking-widest uppercase text-white/40">{label}</p>
                              <p className="mt-1 text-xs text-white/60 leading-relaxed">{text}</p>
                            </div>
                          ))}
                        </div>
                        {insights.topPriorities?.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs font-semibold tracking-widest uppercase text-white/40">Top Priorities</p>
                            <ol className="mt-1 list-decimal list-inside space-y-0.5">
                              {insights.topPriorities.map((p: string) => (
                                <li key={p} className="text-xs text-white/60">{p}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Recommendations */}
                  {(audit.report.recommendations as unknown[])?.length > 0 && (
                    <div>
                      <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">Prioritised Recommendations</h2>
                      <div className="mt-3 space-y-3">
                        {(audit.report.recommendations as {
                          priority: number;
                          title: string;
                          description: string;
                          impact: string;
                          effort: string;
                          category: string;
                        }[]).map((rec) => (
                          <div key={rec.priority} className="border border-white/10 bg-black p-4">
                            <div className="flex items-start gap-3">
                              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center border border-white/20 text-xs font-bold text-white">
                                {rec.priority}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-white">{rec.title}</span>
                                  <span className={`px-1.5 py-0.5 text-xs tracking-wide ${categoryColor(rec.category)}`}>
                                    {rec.category}
                                  </span>
                                  <span className="text-xs text-white/30">effort: {rec.effort}</span>
                                </div>
                                <p className="mt-1 text-xs text-white/60 leading-relaxed">{rec.description}</p>
                                <p className="mt-1 text-xs text-white/30">Impact: {rec.impact}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {audit.status === "FAILED" && (
        <div className="border border-red-500/20 bg-red-500/5 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <h3 className="mt-3 text-xs font-bold tracking-widest uppercase text-red-400">Audit Failed</h3>
          <p className="mt-1 text-sm text-red-400/70">{audit.errorMessage ?? "An unexpected error occurred."}</p>
        </div>
      )}
    </div>
  );
}
