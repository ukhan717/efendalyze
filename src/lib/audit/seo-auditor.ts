import type { PageData, AuditIssue } from "@/types/audit";

interface SeoAuditResult {
  issues: AuditIssue[];
  score: number;
}

/**
 * Performs technical SEO analysis on crawled page data.
 * Does not require external API calls — it works from the already-extracted DOM data.
 */
export class SeoAuditor {
  audit(pages: PageData[]): SeoAuditResult {
    const issues: AuditIssue[] = [];

    for (const page of pages) {
      issues.push(...this.auditPage(page));
    }

    // Cross-page checks
    issues.push(...this.checkDuplicateTitles(pages));
    issues.push(...this.checkDuplicateDescriptions(pages));

    const score = this.calculateScore(issues, pages.length);
    return { issues, score };
  }

  // ─── Per-page checks ─────────────────────────────────────────────────────

  private auditPage(page: PageData): AuditIssue[] {
    const issues: AuditIssue[] = [];

    // Title tag
    if (!page.title) {
      issues.push({
        category: "SEO",
        severity: "CRITICAL",
        title: "Missing page title",
        description: `The page at ${page.url} has no <title> tag.`,
        recommendation:
          "Add a descriptive, unique title tag (50–60 characters) to every page.",
        pageUrl: page.url,
        impact: "Title tags are the most significant on-page SEO ranking signal.",
        effort: "low",
      });
    } else if (page.title.length < 30) {
      issues.push({
        category: "SEO",
        severity: "MEDIUM",
        title: "Title tag too short",
        description: `"${page.title}" is only ${page.title.length} characters (recommended: 50–60).`,
        recommendation: "Expand the title to be more descriptive and keyword-rich.",
        pageUrl: page.url,
        effort: "low",
      });
    } else if (page.title.length > 60) {
      issues.push({
        category: "SEO",
        severity: "LOW",
        title: "Title tag too long",
        description: `"${page.title}" is ${page.title.length} characters and will be truncated in SERPs.`,
        recommendation: "Trim the title to under 60 characters.",
        pageUrl: page.url,
        effort: "low",
      });
    }

    // Meta description
    if (!page.metaDescription) {
      issues.push({
        category: "SEO",
        severity: "HIGH",
        title: "Missing meta description",
        description: `${page.url} has no meta description tag.`,
        recommendation:
          "Add a compelling meta description (120–155 characters) to improve click-through rate.",
        pageUrl: page.url,
        effort: "low",
      });
    } else if (page.metaDescription.length < 50) {
      issues.push({
        category: "SEO",
        severity: "MEDIUM",
        title: "Meta description too short",
        description: `The meta description is only ${page.metaDescription.length} characters.`,
        recommendation: "Write a more detailed meta description (120–155 characters).",
        pageUrl: page.url,
        effort: "low",
      });
    } else if (page.metaDescription.length > 160) {
      issues.push({
        category: "SEO",
        severity: "LOW",
        title: "Meta description too long",
        description: `The meta description (${page.metaDescription.length} chars) will be cut off in SERPs.`,
        recommendation: "Trim to under 155 characters.",
        pageUrl: page.url,
        effort: "low",
      });
    }

    // H1 heading
    const h1List = page.headings["h1"] ?? [];
    if (h1List.length === 0) {
      issues.push({
        category: "SEO",
        severity: "HIGH",
        title: "Missing H1 heading",
        description: `${page.url} has no H1 heading.`,
        recommendation:
          "Add a single, descriptive H1 that clearly communicates the page topic.",
        pageUrl: page.url,
        effort: "low",
      });
    } else if (h1List.length > 1) {
      issues.push({
        category: "SEO",
        severity: "MEDIUM",
        title: "Multiple H1 headings",
        description: `${page.url} has ${h1List.length} H1 headings. Only one is recommended.`,
        recommendation: "Keep a single H1 per page and use H2–H6 for sub-sections.",
        pageUrl: page.url,
        effort: "low",
      });
    }

    // Images without alt text
    const imagesWithoutAlt = page.images.filter(
      (img) => img.alt === null || img.alt.trim() === ""
    );
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        category: "SEO",
        severity: "MEDIUM",
        title: `${imagesWithoutAlt.length} image(s) missing alt text`,
        description:
          `${imagesWithoutAlt.length} of ${page.images.length} images on ${page.url} have no alt attribute, ` +
          `hurting both SEO and accessibility.`,
        recommendation:
          "Add descriptive alt text to every meaningful image. Use alt=\"\" for purely decorative images.",
        pageUrl: page.url,
        element: imagesWithoutAlt[0]?.src,
        effort: "medium",
      });
    }

    // Broken links
    const brokenLinks = page.links.filter((l) => l.isBroken);
    if (brokenLinks.length > 0) {
      issues.push({
        category: "SEO",
        severity: "HIGH",
        title: `${brokenLinks.length} broken link(s) detected`,
        description: `${page.url} contains ${brokenLinks.length} broken link(s): ${brokenLinks
          .slice(0, 3)
          .map((l) => l.href)
          .join(", ")}.`,
        recommendation: "Fix or remove all broken links. They harm both UX and crawlability.",
        pageUrl: page.url,
        effort: "medium",
      });
    }

    // Canonical tag missing
    const hasCanonical = page.metaTags.some(
      (t) => (t.name ?? t.property ?? "").toLowerCase() === "canonical" ||
        t.content?.includes("canonical")
    );
    // Check via raw HTML since canonical is a <link>, not <meta>
    const canonicalMissing = !page.rawHtml.toLowerCase().includes('rel="canonical"') &&
      !page.rawHtml.toLowerCase().includes("rel='canonical'");
    if (canonicalMissing) {
      issues.push({
        category: "SEO",
        severity: "MEDIUM",
        title: "Missing canonical tag",
        description: `${page.url} does not have a canonical link element.`,
        recommendation:
          "Add <link rel=\"canonical\" href=\"...\"> to prevent duplicate content issues.",
        pageUrl: page.url,
        effort: "low",
      });
    }

    // Heading hierarchy check
    const hasH2WithoutH1 = (page.headings["h2"] ?? []).length > 0 && h1List.length === 0;
    if (hasH2WithoutH1) {
      issues.push({
        category: "SEO",
        severity: "LOW",
        title: "Heading hierarchy skips H1",
        description: "The page uses H2 headings but no H1, breaking the heading hierarchy.",
        recommendation: "Ensure headings follow a logical H1 → H2 → H3 structure.",
        pageUrl: page.url,
        effort: "low",
      });
    }

    // Open Graph tags
    const hasOgTitle = page.metaTags.some((t) => t.property === "og:title");
    const hasOgDesc = page.metaTags.some((t) => t.property === "og:description");
    const hasOgImage = page.metaTags.some((t) => t.property === "og:image");
    if (!hasOgTitle || !hasOgDesc || !hasOgImage) {
      issues.push({
        category: "SEO",
        severity: "LOW",
        title: "Incomplete Open Graph tags",
        description: `${page.url} is missing: ${[
          !hasOgTitle && "og:title",
          !hasOgDesc && "og:description",
          !hasOgImage && "og:image",
        ]
          .filter(Boolean)
          .join(", ")}.`,
        recommendation:
          "Add complete Open Graph tags to control how the page appears when shared on social media.",
        pageUrl: page.url,
        effort: "low",
      });
    }

    // Word count — thin content
    if (page.wordCount < 300 && page.wordCount > 0) {
      issues.push({
        category: "SEO",
        severity: "LOW",
        title: "Thin content",
        description: `${page.url} has only ${page.wordCount} words. Search engines may consider this thin content.`,
        recommendation:
          "Expand the page content to at least 300–500 words of high-quality, relevant text.",
        pageUrl: page.url,
        effort: "high",
      });
    }

    // Structured data
    if (page.structuredData.length === 0) {
      issues.push({
        category: "SEO",
        severity: "INFO",
        title: "No structured data (JSON-LD)",
        description: `${page.url} does not include any schema.org structured data.`,
        recommendation:
          "Add relevant Schema.org markup (e.g. Organization, Product, Article) to enable rich results.",
        pageUrl: page.url,
        effort: "medium",
      });
    }

    return issues;
  }

  // ─── Cross-page checks ────────────────────────────────────────────────────

  private checkDuplicateTitles(pages: PageData[]): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const titleMap = new Map<string, string[]>();

    for (const page of pages) {
      if (!page.title) continue;
      const key = page.title.toLowerCase().trim();
      const existing = titleMap.get(key) ?? [];
      titleMap.set(key, [...existing, page.url]);
    }

    for (const [title, urls] of titleMap.entries()) {
      if (urls.length > 1) {
        issues.push({
          category: "SEO",
          severity: "HIGH",
          title: "Duplicate title tags",
          description: `The title "${title}" is used on ${urls.length} pages: ${urls.join(", ")}.`,
          recommendation: "Give each page a unique, descriptive title.",
          effort: "medium",
        });
      }
    }

    return issues;
  }

  private checkDuplicateDescriptions(pages: PageData[]): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const descMap = new Map<string, string[]>();

    for (const page of pages) {
      if (!page.metaDescription) continue;
      const key = page.metaDescription.toLowerCase().trim();
      const existing = descMap.get(key) ?? [];
      descMap.set(key, [...existing, page.url]);
    }

    for (const [, urls] of descMap.entries()) {
      if (urls.length > 1) {
        issues.push({
          category: "SEO",
          severity: "MEDIUM",
          title: "Duplicate meta descriptions",
          description: `The same meta description is used on ${urls.length} pages: ${urls.join(", ")}.`,
          recommendation: "Write unique meta descriptions for each page.",
          effort: "medium",
        });
      }
    }

    return issues;
  }

  // ─── Scoring ─────────────────────────────────────────────────────────────

  private calculateScore(issues: AuditIssue[], pageCount: number): number {
    const penalties: Record<string, number> = {
      CRITICAL: 20,
      HIGH: 10,
      MEDIUM: 5,
      LOW: 2,
      INFO: 0,
    };

    let total = 100;
    for (const issue of issues) {
      total -= penalties[issue.severity] ?? 0;
    }

    return Math.max(0, Math.min(100, total));
  }
}
