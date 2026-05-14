import * as cheerio from "cheerio";
import type { PageData, AuditIssue } from "@/types/audit";

interface AccessibilityAuditResult {
  issues: AuditIssue[];
  score: number;
}

/**
 * Performs WCAG-based accessibility analysis using DOM heuristics.
 * For production, augment with axe-core via Playwright for richer results.
 */
export class AccessibilityAuditor {
  audit(pages: PageData[]): AccessibilityAuditResult {
    const issues: AuditIssue[] = [];

    for (const page of pages) {
      issues.push(...this.auditPage(page));
    }

    const score = this.calculateScore(issues, pages.length);
    return { issues, score };
  }

  private auditPage(page: PageData): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const $ = cheerio.load(page.rawHtml);

    // ── 1. Images missing alt text (WCAG 1.1.1) ──────────────────────────
    const imagesNoAlt = page.images.filter((img) => img.alt === null || img.alt.trim() === "");
    if (imagesNoAlt.length > 0) {
      issues.push({
        category: "ACCESSIBILITY",
        severity: "CRITICAL",
        title: `${imagesNoAlt.length} image(s) missing alt attribute`,
        description:
          `${imagesNoAlt.length} images on ${page.url} have no alt attribute, making them ` +
          "inaccessible to screen readers and users on slow connections.",
        recommendation:
          "Add descriptive alt text to all meaningful images. " +
          "For decorative images, use alt=\"\" so screen readers skip them.",
        wcagCriteria: "WCAG 2.1 Success Criterion 1.1.1 Non-text Content (Level A)",
        pageUrl: page.url,
        element: imagesNoAlt[0]?.src,
        effort: "medium",
      });
    }

    // ── 2. Form inputs missing labels (WCAG 1.3.1 / 3.3.2) ───────────────
    const formsWithUnlabelledInputs = page.forms.filter((f) => !f.hasLabels);
    if (formsWithUnlabelledInputs.length > 0) {
      issues.push({
        category: "ACCESSIBILITY",
        severity: "CRITICAL",
        title: "Form inputs missing associated labels",
        description:
          `${formsWithUnlabelledInputs.length} form(s) on ${page.url} contain inputs without labels, ` +
          "making them unusable for screen reader users.",
        recommendation:
          "Associate every input with a <label for=\"...\">, aria-label, or aria-labelledby.",
        wcagCriteria: "WCAG 2.1 Success Criterion 1.3.1 Info and Relationships (Level A)",
        pageUrl: page.url,
        effort: "low",
      });
    }

    // ── 3. Missing language attribute (WCAG 3.1.1) ───────────────────────
    const htmlLang = $("html").attr("lang");
    if (!htmlLang || htmlLang.trim() === "") {
      issues.push({
        category: "ACCESSIBILITY",
        severity: "HIGH",
        title: "Missing lang attribute on <html>",
        description:
          `${page.url} does not specify a language via <html lang="...">, ` +
          "causing screen readers to default to the wrong language.",
        recommendation: 'Add lang="en" (or the appropriate language code) to the <html> element.',
        wcagCriteria: "WCAG 2.1 Success Criterion 3.1.1 Language of Page (Level A)",
        pageUrl: page.url,
        element: "<html>",
        effort: "low",
      });
    }

    // ── 4. Missing skip navigation link (WCAG 2.4.1) ─────────────────────
    const hasSkipLink =
      page.rawHtml.toLowerCase().includes("skip to content") ||
      page.rawHtml.toLowerCase().includes("skip to main");
    if (!hasSkipLink) {
      issues.push({
        category: "ACCESSIBILITY",
        severity: "MEDIUM",
        title: 'Missing "skip to main content" link',
        description:
          `${page.url} has no skip-navigation link, forcing keyboard users to tab through ` +
          "the entire navigation on every page.",
        recommendation:
          'Add a visually hidden "Skip to main content" link as the first focusable element.',
        wcagCriteria: "WCAG 2.1 Success Criterion 2.4.1 Bypass Blocks (Level A)",
        pageUrl: page.url,
        effort: "low",
      });
    }

    // ── 5. Missing main landmark (WCAG 1.3.6 / 4.1.2) ────────────────────
    const hasMain = $("main, [role='main']").length > 0;
    if (!hasMain) {
      issues.push({
        category: "ACCESSIBILITY",
        severity: "MEDIUM",
        title: "Missing <main> landmark",
        description: `${page.url} has no <main> element or role="main", making page structure unclear to assistive tech.`,
        recommendation:
          "Wrap the primary page content in a <main> element so screen readers can jump directly to it.",
        wcagCriteria: "WCAG 2.1 Success Criterion 1.3.6 Identify Purpose (Level AAA)",
        pageUrl: page.url,
        effort: "low",
      });
    }

    // ── 6. Links with ambiguous text (WCAG 2.4.4) ────────────────────────
    const AMBIGUOUS = ["click here", "read more", "here", "learn more", "more", "this"];
    const ambiguousLinks = page.links.filter((l) =>
      AMBIGUOUS.includes(l.text.toLowerCase().trim())
    );
    if (ambiguousLinks.length > 0) {
      issues.push({
        category: "ACCESSIBILITY",
        severity: "MEDIUM",
        title: `${ambiguousLinks.length} link(s) with ambiguous text`,
        description:
          `Phrases like "click here" or "read more" are meaningless out of context for ` +
          `screen reader users. Found on ${page.url}: "${ambiguousLinks[0]?.text}".`,
        recommendation:
          "Use descriptive link text that explains the destination (e.g. 'Read our pricing guide').",
        wcagCriteria: "WCAG 2.1 Success Criterion 2.4.4 Link Purpose (Level A)",
        pageUrl: page.url,
        effort: "medium",
      });
    }

    // ── 7. Missing viewport meta (mobile/zoom accessibility) ─────────────
    const hasViewport = page.metaTags.some((t) => t.name?.toLowerCase() === "viewport");
    if (!hasViewport) {
      issues.push({
        category: "ACCESSIBILITY",
        severity: "HIGH",
        title: "Missing viewport meta tag",
        description:
          `${page.url} does not include a viewport meta tag, causing poor mobile rendering ` +
          "and preventing users from being able to zoom the text.",
        recommendation:
          'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
        pageUrl: page.url,
        effort: "low",
      });
    }

    // ── 8. Interactive elements without accessible names ──────────────────
    $("button").each((_, el) => {
      const text = $(el).text().trim();
      const ariaLabel = $(el).attr("aria-label");
      const ariaLabelledBy = $(el).attr("aria-labelledby");
      const title = $(el).attr("title");

      if (!text && !ariaLabel && !ariaLabelledBy && !title) {
        issues.push({
          category: "ACCESSIBILITY",
          severity: "HIGH",
          title: "Button without accessible name",
          description: `${page.url} contains a <button> element with no text, aria-label, or title.`,
          recommendation: "Add visible text or an aria-label to every button.",
          wcagCriteria: "WCAG 2.1 Success Criterion 4.1.2 Name, Role, Value (Level A)",
          pageUrl: page.url,
          element: $.html(el)?.slice(0, 200),
          effort: "low",
        });
        return false; // report once per page
      }
    });

    // ── 9. Tables missing headers ─────────────────────────────────────────
    $("table").each((_, el) => {
      const hasHeaders = $(el).find("th").length > 0;
      if (!hasHeaders) {
        issues.push({
          category: "ACCESSIBILITY",
          severity: "MEDIUM",
          title: "Data table missing header cells",
          description: `${page.url} contains a <table> with no <th> elements.`,
          recommendation:
            "Add <th scope='col'> or <th scope='row'> to identify table headers.",
          wcagCriteria: "WCAG 2.1 Success Criterion 1.3.1 Info and Relationships (Level A)",
          pageUrl: page.url,
          effort: "low",
        });
        return false;
      }
    });

    // ── 10. iFrames missing title ─────────────────────────────────────────
    $("iframe").each((_, el) => {
      const frameTitle = $(el).attr("title");
      if (!frameTitle) {
        issues.push({
          category: "ACCESSIBILITY",
          severity: "MEDIUM",
          title: "<iframe> missing title attribute",
          description: `${page.url} contains an <iframe> without a title, making its content inaccessible.`,
          recommendation: "Add a descriptive title attribute to every <iframe>.",
          wcagCriteria: "WCAG 2.1 Success Criterion 4.1.2 Name, Role, Value (Level A)",
          pageUrl: page.url,
          effort: "low",
        });
        return false;
      }
    });

    return issues;
  }

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
