import type { AuditIssue, AuditScores } from "@/types/audit";

const WEIGHTS = {
  seo: 0.20,
  accessibility: 0.20,
  performance: 0.20,
  uxUi: 0.15,
  content: 0.10,
  trust: 0.05,
  mobile: 0.10,
};

/**
 * Calculates category scores from raw issues and combines them into
 * a weighted overall score with quick wins and critical issue summaries.
 */
export function calculateScores(
  issues: AuditIssue[],
  categorizedScores: {
    seo: number;
    accessibility: number;
    performance: number;
    uxUi?: number;
    content?: number;
    mobile?: number;
  }
): AuditScores {
  // Derive UX/UI, content, trust, and mobile scores from issues if not provided
  const uxScore = categorizedScores.uxUi ?? deriveScore(issues, "UX_UI");
  const contentScore = categorizedScores.content ?? deriveScore(issues, "CONTENT");
  const trustScore = deriveScore(issues, "TRUST");
  const mobileScore = categorizedScores.mobile ?? deriveScore(issues, "MOBILE");

  const { seo, accessibility, performance } = categorizedScores;

  const overall = Math.round(
    seo * WEIGHTS.seo +
    accessibility * WEIGHTS.accessibility +
    performance * WEIGHTS.performance +
    uxScore * WEIGHTS.uxUi +
    contentScore * WEIGHTS.content +
    trustScore * WEIGHTS.trust +
    mobileScore * WEIGHTS.mobile
  );

  const criticalIssues = issues
    .filter((i) => i.severity === "CRITICAL")
    .slice(0, 5)
    .map((i) => i.title);

  const quickWins = issues
    .filter((i) => i.effort === "low" && (i.severity === "HIGH" || i.severity === "MEDIUM"))
    .slice(0, 5)
    .map((i) => i.title);

  return {
    overall: Math.max(0, Math.min(100, overall)),
    seo: Math.max(0, Math.min(100, seo)),
    accessibility: Math.max(0, Math.min(100, accessibility)),
    performance: Math.max(0, Math.min(100, performance)),
    uxUi: Math.max(0, Math.min(100, uxScore)),
    content: Math.max(0, Math.min(100, contentScore)),
    trust: Math.max(0, Math.min(100, trustScore)),
    mobile: Math.max(0, Math.min(100, mobileScore)),
    quickWins,
    criticalIssues,
  };
}

function deriveScore(issues: AuditIssue[], category: AuditIssue["category"]): number {
  const categoryIssues = issues.filter((i) => i.category === category);

  const penalties: Record<string, number> = {
    CRITICAL: 20,
    HIGH: 10,
    MEDIUM: 5,
    LOW: 2,
    INFO: 0,
  };

  let score = 100;
  for (const issue of categoryIssues) {
    score -= penalties[issue.severity] ?? 0;
  }

  return Math.max(0, score);
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Needs Improvement";
  if (score >= 40) return "Poor";
  return "Critical";
}
