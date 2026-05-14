import { WebCrawler } from "./crawler";
import { SeoAuditor } from "./seo-auditor";
import { AccessibilityAuditor } from "./accessibility-auditor";
import { PerformanceAuditor } from "./performance-auditor";
import { BugDetector } from "./bug-detector";
import { calculateScores } from "./scoring";
import { UXCritiqueAnalyzer } from "@/lib/ai/ux-critique";
import { ContentAnalyzer } from "@/lib/ai/content-analysis";
import { ReportGenerator } from "@/lib/ai/report-generator";
import { prisma } from "@/lib/db/client";
import type {
  CrawlOptions,
  AuditIssue,
  AuditPipelineResult,
  PageData,
} from "@/types/audit";

/**
 * Orchestrates the full audit pipeline for a given auditId.
 * Updates the audit record in the database as progress advances.
 */
export async function runAuditPipeline(
  auditId: string,
  options: CrawlOptions
): Promise<AuditPipelineResult> {
  const updateProgress = async (progress: number, status: string) => {
    await prisma.audit.update({
      where: { id: auditId },
      data: { progress, status: status as never },
    });
  };

  try {
    // ── Phase 1: Crawl ───────────────────────────────────────────────────
    await updateProgress(5, "CRAWLING");
    const crawler = new WebCrawler(options);
    const pages = await crawler.crawl();

    await updateProgress(30, "ANALYZING");

    // ── Phase 2: Technical Audits ────────────────────────────────────────
    const [seoResult, accessibilityResult, performanceResult, bugResult] =
      await Promise.all([
        Promise.resolve(new SeoAuditor().audit(pages)),
        Promise.resolve(new AccessibilityAuditor().audit(pages)),
        Promise.resolve(new PerformanceAuditor().audit(pages)),
        Promise.resolve(new BugDetector().detect(pages)),
      ]);

    await updateProgress(55, "ANALYZING");

    // ── Phase 3: AI Analysis (runs on homepage only to conserve API calls) ─
    const homePage = pages[0];
    let uxCritique;
    let contentAnalysis;
    const aiIssues: AuditIssue[] = [];

    if (homePage) {
      const [uxResult, contentResult] = await Promise.all([
        new UXCritiqueAnalyzer().analyze(homePage),
        new ContentAnalyzer().analyze(homePage),
      ]);
      uxCritique = uxResult;
      contentAnalysis = contentResult;
      aiIssues.push(...uxResult.issues, ...contentResult.issues);
    }

    await updateProgress(75, "GENERATING_REPORT");

    // ── Phase 4: Aggregate Issues ────────────────────────────────────────
    const allIssues: AuditIssue[] = [
      ...seoResult.issues,
      ...accessibilityResult.issues,
      ...performanceResult.issues,
      ...bugResult.issues,
      ...aiIssues,
    ];

    // ── Phase 5: Calculate Scores ─────────────────────────────────────────
    const scores = calculateScores(allIssues, {
      seo: seoResult.score,
      accessibility: accessibilityResult.score,
      performance: performanceResult.score,
    });

    // ── Phase 6: Generate Report ──────────────────────────────────────────
    const reportGenerator = new ReportGenerator();
    const report = await reportGenerator.generate({
      url: options.url,
      pages,
      issues: allIssues,
      scores,
      uxCritique,
      contentAnalysis,
    });

    // ── Phase 7: Persist to Database ──────────────────────────────────────
    await persistResults(auditId, pages, allIssues, scores, report);

    await updateProgress(100, "COMPLETED");
    await prisma.audit.update({
      where: { id: auditId },
      data: { completedAt: new Date() },
    });

    return { pages, issues: allIssues, scores, report };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: "FAILED", errorMessage: message },
    });
    throw err;
  }
}

async function persistResults(
  auditId: string,
  pages: PageData[],
  issues: AuditIssue[],
  scores: ReturnType<typeof calculateScores>,
  report: Awaited<ReturnType<InstanceType<typeof ReportGenerator>["generate"]>>
): Promise<void> {
  // Save pages
  const createdPages = await Promise.all(
    pages.map((p) =>
      prisma.auditPage.create({
        data: {
          auditId,
          url: p.url,
          title: p.title,
          metaDescription: p.metaDescription,
          statusCode: p.statusCode,
          loadTimeMs: p.loadTimeMs,
          wordCount: p.wordCount,
          headings: p.headings as never,
          images: p.images as never,
          links: p.links as never,
          forms: p.forms as never,
          structuredData: p.structuredData as never,
          metaTags: p.metaTags as never,
          consoleErrors: p.consoleErrors as never,
          screenshotDesktop: p.screenshotDesktop,
          screenshotMobile: p.screenshotMobile,
          fcp: p.fcp,
          lcp: p.lcp,
          cls: p.cls,
          tti: p.tti,
          tbt: p.tbt,
          performanceScore: p.performanceScore,
        },
      })
    )
  );

  // Map page URLs to IDs for issue association
  const pageUrlToId = new Map(createdPages.map((p) => [p.url, p.id]));

  // Save issues in batches
  const BATCH_SIZE = 50;
  for (let i = 0; i < issues.length; i += BATCH_SIZE) {
    const batch = issues.slice(i, i + BATCH_SIZE);
    await prisma.auditIssue.createMany({
      data: batch.map((issue) => ({
        auditId,
        pageId: issue.pageUrl ? (pageUrlToId.get(issue.pageUrl) ?? null) : null,
        category: issue.category,
        severity: issue.severity,
        title: issue.title,
        description: issue.description,
        recommendation: issue.recommendation,
        element: issue.element ?? null,
        screenshotUrl: issue.screenshotUrl ?? null,
        wcagCriteria: issue.wcagCriteria ?? null,
        impact: issue.impact ?? null,
        effort: issue.effort ?? null,
        aiGenerated: issue.aiGenerated ?? false,
      })),
    });
  }

  // Save scores
  await prisma.auditScore.create({
    data: {
      auditId,
      overall: scores.overall,
      seo: scores.seo,
      accessibility: scores.accessibility,
      performance: scores.performance,
      uxUi: scores.uxUi,
      content: scores.content,
      trust: scores.trust,
      mobile: scores.mobile,
      quickWins: scores.quickWins,
      criticalIssues: scores.criticalIssues,
    },
  });

  // Save report
  await prisma.auditReport.create({
    data: {
      auditId,
      executiveSummary: report.executiveSummary,
      methodology: report.methodology,
      keyFindings: report.keyFindings as never,
      recommendations: report.recommendations as never,
      aiInsights: report.aiInsights as never,
    },
  });
}
