import type { PageData, AuditIssue, PerformanceMetrics } from "@/types/audit";

interface PerformanceAuditResult {
  issues: AuditIssue[];
  score: number;
  metrics: PerformanceMetrics[];
}

/**
 * Analyses performance data already captured by the crawler.
 * Full Lighthouse integration would run server-side on each URL.
 */
export class PerformanceAuditor {
  audit(pages: PageData[]): PerformanceAuditResult {
    const issues: AuditIssue[] = [];
    const metrics: PerformanceMetrics[] = [];

    for (const page of pages) {
      const pageMetrics = this.buildMetrics(page);
      metrics.push(pageMetrics);
      issues.push(...this.auditPage(page, pageMetrics));
    }

    const score = this.calculateScore(pages);
    return { issues, score, metrics };
  }

  private buildMetrics(page: PageData): PerformanceMetrics {
    return {
      fcp: page.fcp ?? null,
      lcp: page.lcp ?? null,
      cls: page.cls ?? null,
      tti: page.tti ?? null,
      tbt: page.tbt ?? null,
      score: page.performanceScore ?? null,
    };
  }

  private auditPage(page: PageData, metrics: PerformanceMetrics): AuditIssue[] {
    const issues: AuditIssue[] = [];

    // ── Load time ─────────────────────────────────────────────────────────
    if (page.loadTimeMs > 5000) {
      issues.push({
        category: "PERFORMANCE",
        severity: "CRITICAL",
        title: "Very slow page load time",
        description: `${page.url} took ${(page.loadTimeMs / 1000).toFixed(1)}s to load. ` +
          "Google recommends under 2.5s.",
        recommendation:
          "Optimise server response time, reduce render-blocking resources, compress images, and enable caching.",
        pageUrl: page.url,
        impact: "Every additional second of load time reduces conversions by ~7%.",
        effort: "high",
      });
    } else if (page.loadTimeMs > 3000) {
      issues.push({
        category: "PERFORMANCE",
        severity: "HIGH",
        title: "Slow page load time",
        description: `${page.url} loaded in ${(page.loadTimeMs / 1000).toFixed(1)}s.`,
        recommendation: "Aim for under 2.5s. Investigate render-blocking JS/CSS and unoptimised images.",
        pageUrl: page.url,
        effort: "high",
      });
    }

    // ── LCP ───────────────────────────────────────────────────────────────
    if (metrics.lcp !== null && metrics.lcp > 4000) {
      issues.push({
        category: "PERFORMANCE",
        severity: "CRITICAL",
        title: "Poor Largest Contentful Paint (LCP)",
        description: `LCP is ${(metrics.lcp / 1000).toFixed(2)}s on ${page.url}. ` +
          "Google's threshold for 'Good' is under 2.5s.",
        recommendation:
          "Optimise the largest above-the-fold element: use a CDN, preload hero images, avoid lazy-loading it.",
        wcagCriteria: "Core Web Vital: LCP",
        pageUrl: page.url,
        effort: "high",
      });
    } else if (metrics.lcp !== null && metrics.lcp > 2500) {
      issues.push({
        category: "PERFORMANCE",
        severity: "HIGH",
        title: "Needs Improvement: Largest Contentful Paint",
        description: `LCP is ${(metrics.lcp / 1000).toFixed(2)}s. Needs to be under 2.5s.`,
        recommendation: "Preload critical assets and serve images in next-gen formats (WebP/AVIF).",
        pageUrl: page.url,
        effort: "medium",
      });
    }

    // ── CLS ───────────────────────────────────────────────────────────────
    if (metrics.cls !== null && metrics.cls > 0.25) {
      issues.push({
        category: "PERFORMANCE",
        severity: "HIGH",
        title: "High Cumulative Layout Shift (CLS)",
        description: `CLS score is ${metrics.cls.toFixed(3)} on ${page.url}. ` +
          "Good CLS is under 0.1.",
        recommendation:
          "Add explicit width/height to images and iframes. Avoid inserting content above existing content.",
        pageUrl: page.url,
        effort: "medium",
      });
    }

    // ── Images ────────────────────────────────────────────────────────────
    const imagesNoSize = page.images.filter((img) => !img.width || !img.height);
    if (imagesNoSize.length > 0) {
      issues.push({
        category: "PERFORMANCE",
        severity: "MEDIUM",
        title: `${imagesNoSize.length} image(s) missing explicit dimensions`,
        description:
          `Images without width/height attributes cause layout shifts and prevent the browser ` +
          "from reserving space correctly.",
        recommendation: "Add width and height attributes to all <img> elements.",
        pageUrl: page.url,
        effort: "low",
      });
    }

    // ── Console errors ────────────────────────────────────────────────────
    const jsErrors = page.consoleErrors.filter((e) => e.type === "error");
    if (jsErrors.length > 0) {
      issues.push({
        category: "BUGS",
        severity: "HIGH",
        title: `${jsErrors.length} JavaScript console error(s)`,
        description: `${page.url} produces runtime JS errors: "${jsErrors[0]?.message}".`,
        recommendation: "Fix all console errors. They indicate broken functionality that harms UX.",
        pageUrl: page.url,
        effort: "medium",
      });
    }

    return issues;
  }

  private calculateScore(pages: PageData[]): number {
    const scored = pages.filter((p) => p.performanceScore !== undefined && p.performanceScore !== null);
    if (scored.length === 0) {
      // Fall back to load-time heuristic
      const avgLoad = pages.reduce((sum, p) => sum + p.loadTimeMs, 0) / (pages.length || 1);
      if (avgLoad < 1500) return 90;
      if (avgLoad < 2500) return 75;
      if (avgLoad < 4000) return 55;
      return 35;
    }

    const avg = scored.reduce((sum, p) => sum + (p.performanceScore ?? 0), 0) / scored.length;
    return Math.round(avg);
  }
}
