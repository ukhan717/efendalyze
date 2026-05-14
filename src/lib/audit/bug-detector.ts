import type { PageData, AuditIssue } from "@/types/audit";
import * as cheerio from "cheerio";

interface BugDetectionResult {
  issues: AuditIssue[];
}

/**
 * Detects bugs, layout inconsistencies, broken functionality,
 * and responsiveness issues from crawled page data.
 */
export class BugDetector {
  detect(pages: PageData[]): BugDetectionResult {
    const issues: AuditIssue[] = [];

    for (const page of pages) {
      issues.push(...this.detectPageBugs(page));
    }

    // Cross-page consistency checks
    issues.push(...this.checkStyleConsistency(pages));

    return { issues };
  }

  private detectPageBugs(page: PageData): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const $ = cheerio.load(page.rawHtml);

    // ── Broken links ──────────────────────────────────────────────────────
    const brokenLinks = page.links.filter((l) => l.isBroken);
    if (brokenLinks.length > 0) {
      issues.push({
        category: "BUGS",
        severity: "HIGH",
        title: "Broken navigation links",
        description: `${brokenLinks.length} broken link(s) detected on ${page.url}.`,
        recommendation: "Fix or redirect broken links to maintain user trust and SEO value.",
        pageUrl: page.url,
        effort: "medium",
      });
    }

    // ── Empty buttons / CTAs ──────────────────────────────────────────────
    const emptyButtons: string[] = [];
    $("button, a.btn, a.button, [role='button']").each((_, el) => {
      const text = $(el).text().trim();
      const hasIcon = $(el).find("svg, img, i").length > 0;
      const ariaLabel = $(el).attr("aria-label");
      if (!text && !hasIcon && !ariaLabel) {
        emptyButtons.push($.html(el)?.slice(0, 100) ?? "");
      }
    });

    if (emptyButtons.length > 0) {
      issues.push({
        category: "BUGS",
        severity: "HIGH",
        title: "Empty or invisible button/CTA elements",
        description:
          `${emptyButtons.length} button(s) on ${page.url} have no visible text, icon, or accessible label.`,
        recommendation: "Add meaningful text or an aria-label to every interactive button.",
        pageUrl: page.url,
        element: emptyButtons[0],
        effort: "low",
      });
    }

    // ── Console errors ────────────────────────────────────────────────────
    const errors = page.consoleErrors.filter((e) => e.type === "error");
    if (errors.length > 0) {
      issues.push({
        category: "BUGS",
        severity: "CRITICAL",
        title: "JavaScript runtime errors in browser console",
        description:
          `${errors.length} JS error(s) on ${page.url}: "${errors[0]?.message}"`,
        recommendation:
          "Fix all JavaScript errors. These can break interactive functionality and degrade user experience.",
        pageUrl: page.url,
        effort: "medium",
      });
    }

    // ── Broken images ─────────────────────────────────────────────────────
    $("img").each((_, el) => {
      const src = $(el).attr("src");
      if (!src || src.trim() === "") {
        issues.push({
          category: "BUGS",
          severity: "HIGH",
          title: "Image with missing src attribute",
          description: `An <img> tag on ${page.url} has an empty or missing src.`,
          recommendation: "Ensure all <img> elements have a valid src attribute.",
          pageUrl: page.url,
          element: $.html(el)?.slice(0, 200),
          effort: "low",
        });
        return false; // report once
      }
    });

    // ── Forms without action ──────────────────────────────────────────────
    const formsNoAction = page.forms.filter(
      (f) => !f.action && f.method.toLowerCase() !== "dialog"
    );
    if (formsNoAction.length > 0) {
      issues.push({
        category: "BUGS",
        severity: "MEDIUM",
        title: "Form(s) missing action attribute",
        description:
          `${formsNoAction.length} form(s) on ${page.url} have no action attribute.`,
        recommendation:
          "Ensure each form has a valid action URL or is handled via JavaScript event listeners.",
        pageUrl: page.url,
        effort: "low",
      });
    }

    // ── Inline styles suggesting layout fixes ─────────────────────────────
    const overflowHidden = $("[style*='overflow: hidden'], [style*='overflow:hidden']").length;
    if (overflowHidden > 5) {
      issues.push({
        category: "BUGS",
        severity: "LOW",
        title: "Excessive overflow:hidden usage detected",
        description:
          `${overflowHidden} elements on ${page.url} use overflow:hidden inline styles, ` +
          "which may be masking layout overflow issues.",
        recommendation: "Review layout overflow handling; prefer CSS classes over inline styles.",
        pageUrl: page.url,
        effort: "medium",
      });
    }

    // ── Missing favicon ───────────────────────────────────────────────────
    const hasFavicon =
      page.rawHtml.toLowerCase().includes('rel="icon"') ||
      page.rawHtml.toLowerCase().includes("rel='icon'") ||
      page.rawHtml.toLowerCase().includes("rel=icon");
    if (!hasFavicon && page.url === page.url /* homepage only */) {
      issues.push({
        category: "BRANDING",
        severity: "LOW",
        title: "Missing favicon",
        description: "No favicon found. This harms brand recognition in browser tabs.",
        recommendation: "Add a favicon via <link rel='icon' href='/favicon.ico'>.",
        pageUrl: page.url,
        effort: "low",
      });
    }

    return issues;
  }

  private checkStyleConsistency(pages: PageData[]): AuditIssue[] {
    const issues: AuditIssue[] = [];

    // Collect all fonts used across pages
    const fontSets = pages.map((p) => {
      const $ = cheerio.load(p.rawHtml);
      const fonts = new Set<string>();
      $("[style*='font-family']").each((_, el) => {
        const style = $(el).attr("style") ?? "";
        const match = style.match(/font-family:\s*([^;]+)/i);
        if (match) fonts.add(match[1].trim().toLowerCase());
      });
      return { url: p.url, fonts };
    });

    // If too many distinct font families across pages, flag inconsistency
    const allFonts = new Set(fontSets.flatMap((f) => [...f.fonts]));
    if (allFonts.size > 4) {
      issues.push({
        category: "BRANDING",
        severity: "MEDIUM",
        title: "Inconsistent font usage across pages",
        description:
          `${allFonts.size} different inline font families detected across pages. ` +
          "This suggests inconsistent design.",
        recommendation:
          "Define a consistent typography system with 1–2 font families applied globally via CSS.",
        effort: "medium",
      });
    }

    return issues;
  }
}
