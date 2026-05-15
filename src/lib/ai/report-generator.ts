import { openai, TEXT_MODEL } from "./client";
import type {
  AuditIssue,
  AuditScores,
  PageData,
  AuditReport,
  UXCritiqueResult,
  ContentAnalysisResult,
  ReportFinding,
  ReportRecommendation,
} from "@/types/audit";

/**
 * Generates the final professional audit report using AI.
 * Synthesises all audit findings into a client-ready narrative.
 */
export class ReportGenerator {
  async generate(params: {
    url: string;
    pages: PageData[];
    issues: AuditIssue[];
    scores: AuditScores;
    uxCritique?: UXCritiqueResult;
    contentAnalysis?: ContentAnalysisResult;
  }): Promise<AuditReport> {
    const { url, pages, issues, scores, uxCritique, contentAnalysis } = params;

    const systemPrompt = `You are a senior digital consultant writing a professional website audit report.
The report is for delivery to a client — it must be professional, clear, and free of excessive jargon.

Tone: authoritative but accessible. Avoid phrases like "it is recommended that you consider".
Be direct: "Fix X by doing Y" is better than "You may want to consider addressing X".`;

    const issuesSummary = this.buildIssuesSummary(issues);

    const userPrompt = `Write a professional website audit report for: ${url}

Audit Statistics:
- Pages crawled: ${pages.length}
- Total issues found: ${issues.length}
- Critical issues: ${issues.filter((i) => i.severity === "CRITICAL").length}
- High severity: ${issues.filter((i) => i.severity === "HIGH").length}

Scores (0–100):
- Overall: ${scores.overall}
- SEO: ${scores.seo}
- Accessibility: ${scores.accessibility}
- Performance: ${scores.performance}
- UX/UI: ${scores.uxUi}
- Content: ${scores.content}
- Trust/Credibility: ${scores.trust}
- Mobile Experience: ${scores.mobile}

Top Issues:
${issuesSummary}

UX Assessment: ${uxCritique?.overallAssessment ?? "N/A"}
Content Assessment: ${contentAnalysis?.messagingClarity ?? "N/A"}

Return the report as JSON with this structure:
{
  "executiveSummary": "2–3 paragraph executive summary. Acknowledge strengths briefly, focus on key improvements.",
  "methodology": "1 paragraph describing audit methodology (crawling, automated + AI analysis, screenshots).",
  "keyFindings": [
    { "title": "Finding title", "description": "Clear description", "severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "SEO|ACCESSIBILITY|PERFORMANCE|UX_UI|CONTENT|MOBILE|TRUST|BUGS|BRANDING|SECURITY" }
  ],
  "recommendations": [
    { "priority": 1, "title": "Action title", "description": "Specific action", "impact": "Expected impact", "effort": "low|medium|high", "category": "..." }
  ],
  "aiInsights": {
    "uxCritique": "2-3 sentences on UX strengths and weaknesses",
    "contentAnalysis": "2-3 sentences on content quality",
    "trustAnalysis": "2-3 sentences on trust and credibility signals",
    "overallAssessment": "2-3 sentences overall",
    "topPriorities": ["Priority 1", "Priority 2", "Priority 3"]
  }
}`;

    try {
      const response = await openai.chat.completions.create({
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
        temperature: 0.4,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as AuditReport;
    } catch (err) {
      console.error("[report-generator] AI call failed:", err);
      return this.fallbackReport(url, issues, scores);
    }
  }

  private buildIssuesSummary(issues: AuditIssue[]): string {
    const criticals = issues.filter((i) => i.severity === "CRITICAL").slice(0, 5);
    const highs = issues.filter((i) => i.severity === "HIGH").slice(0, 5);

    return [
      ...criticals.map((i) => `[CRITICAL] ${i.title}: ${i.description.slice(0, 100)}`),
      ...highs.map((i) => `[HIGH] ${i.title}: ${i.description.slice(0, 100)}`),
    ].join("\n");
  }

  private fallbackReport(
    url: string,
    issues: AuditIssue[],
    scores: AuditScores
  ): AuditReport {
    const criticals = issues.filter((i) => i.severity === "CRITICAL");
    const highs = issues.filter((i) => i.severity === "HIGH");

    return {
      executiveSummary:
        `This audit of ${url} identified ${issues.length} issues across multiple categories. ` +
        `The overall score is ${scores.overall}/100. ` +
        `There are ${criticals.length} critical and ${highs.length} high-priority issues requiring immediate attention.`,
      methodology:
        "The audit was conducted using automated crawling, technical analysis, accessibility checks, " +
        "and AI-powered UX and content review.",
      keyFindings: issues.slice(0, 10).map((i) => ({
        title: i.title,
        description: i.description,
        severity: i.severity,
        category: i.category,
      })) as ReportFinding[],
      recommendations: issues
        .filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH")
        .slice(0, 10)
        .map((i, idx) => ({
          priority: idx + 1,
          title: i.title,
          description: i.recommendation,
          impact: i.impact ?? "Significant improvement expected.",
          effort: i.effort ?? "medium",
          category: i.category,
        })) as ReportRecommendation[],
      aiInsights: {
        uxCritique: "Review the UX/UI findings for detailed design recommendations.",
        contentAnalysis: "Review the content findings for messaging improvements.",
        trustAnalysis: "Review the trust/credibility findings.",
        overallAssessment: `Score: ${scores.overall}/100. Focus on critical issues first.`,
        topPriorities: criticals.slice(0, 3).map((i) => i.title),
      },
    };
  }
}
