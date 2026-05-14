import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import * as cheerio from "cheerio";
import {
  sanitizeUrl,
  isSameOrigin,
  resolveUrl,
  normalizeUrl,
} from "@/lib/utils/url";
import type {
  CrawlOptions,
  PageData,
  ImageData,
  LinkData,
  FormData,
  FormField,
  MetaTag,
  ConsoleError,
} from "@/types/audit";

const DEFAULT_MAX_PAGES = 10;
const DEFAULT_MAX_DEPTH = 2;
const PAGE_TIMEOUT_MS = 30_000;
const NAV_TIMEOUT_MS = 30_000;
const CRAWL_CONCURRENCY = 3;

// Page types to prioritise during crawl
const PRIORITY_PATTERNS = [
  /\/(index|home|main)?$/,
  /\/about/,
  /\/services?/,
  /\/products?/,
  /\/contact/,
  /\/pricing/,
  /\/features?/,
  /\/landing/,
  /\/blog/,
];

/**
 * Crawler uses Playwright to visit pages, extract structured data,
 * and capture screenshots. Respects depth limits and avoids re-visiting.
 */
export class WebCrawler {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private visited = new Set<string>();
  private queue: Array<{ url: string; depth: number }> = [];
  private results: PageData[] = [];
  private options: Required<CrawlOptions>;

  constructor(options: CrawlOptions) {
    this.options = {
      url: sanitizeUrl(options.url),
      maxPages: options.maxPages ?? DEFAULT_MAX_PAGES,
      maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
      respectRobotsTxt: options.respectRobotsTxt ?? false,
      includeExternalLinks: options.includeExternalLinks ?? false,
    };
  }

  async crawl(): Promise<PageData[]> {
    await this.launch();

    try {
      const seedUrl = this.options.url;
      this.queue.push({ url: seedUrl, depth: 0 });

      while (this.queue.length > 0 && this.results.length < this.options.maxPages) {
        // Sort queue: prefer priority pages first
        this.queue.sort((a, b) => this.priorityScore(b.url) - this.priorityScore(a.url));

        // Build a batch of up to CRAWL_CONCURRENCY un-visited URLs
        const batch: Array<{ url: string; depth: number }> = [];
        while (
          batch.length < CRAWL_CONCURRENCY &&
          this.queue.length > 0 &&
          this.results.length + batch.length < this.options.maxPages
        ) {
          const next = this.queue.shift();
          if (!next) break;
          const normalised = normalizeUrl(next.url);
          if (this.visited.has(normalised)) continue;
          this.visited.add(normalised);
          batch.push(next);
        }

        if (batch.length === 0) break;

        const pageResults = await Promise.all(
          batch.map(({ url, depth }) => this.visitPage(url, depth))
        );

        for (let i = 0; i < pageResults.length; i++) {
          const pageData = pageResults[i];
          const { depth } = batch[i];
          if (pageData) {
            this.results.push(pageData);
            // Enqueue discovered internal links
            if (depth < this.options.maxDepth) {
              for (const link of pageData.links) {
                if (!link.isExternal) {
                  const norm = normalizeUrl(link.href);
                  if (!this.visited.has(norm)) {
                    this.queue.push({ url: link.href, depth: depth + 1 });
                  }
                }
              }
            }
          }
        }
      }
    } finally {
      await this.teardown();
    }

    return this.results;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private async launch(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    this.context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (compatible; Efendalyze/1.0; +https://efendalyze.com/bot)",
      viewport: { width: 1440, height: 900 },
      locale: "en-US",
      javaScriptEnabled: true,
    });
  }

  private async teardown(): Promise<void> {
    await this.context?.close().catch(() => null);
    await this.browser?.close().catch(() => null);
  }

  private async visitPage(url: string, depth: number): Promise<PageData | null> {
    const page = await this.context!.newPage();
    const consoleErrors: ConsoleError[] = [];

    try {
      // Capture console errors
      page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") {
          consoleErrors.push({ type: msg.type() as "error" | "warning", message: msg.text() });
        }
      });

      const start = Date.now();

      // Homepage: wait for full load (needed for accurate screenshots)
      // Inner pages: domcontentloaded is enough for HTML extraction
      const response = await page.goto(url, {
        waitUntil: depth === 0 ? "load" : "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      });

      const loadTimeMs = Date.now() - start;
      const statusCode = response?.status() ?? 0;

      // Skip error pages from extracting content
      if (statusCode >= 400) {
        return {
          url,
          title: null,
          metaDescription: null,
          statusCode,
          loadTimeMs,
          wordCount: 0,
          headings: {},
          images: [],
          links: [],
          forms: [],
          structuredData: [],
          metaTags: [],
          consoleErrors,
          rawHtml: "",
        };
      }

      // Brief wait for JS-rendered content (homepage only)
      if (depth === 0) await page.waitForTimeout(300);

      const html = await page.content();
      const $ = cheerio.load(html);

      const title = await page.title();
      const metaDescription =
        $('meta[name="description"]').attr("content") ?? null;
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      const wordCount = bodyText.split(" ").filter(Boolean).length;

      const headings = this.extractHeadings($);
      const images = this.extractImages($, url);
      const links = this.extractLinks($, url);
      const forms = this.extractForms($);
      const metaTags = this.extractMetaTags($);
      const structuredData = this.extractStructuredData($);

      // Screenshots — only for the homepage (depth 0) to avoid per-page overhead
      const screenshotDesktop = depth === 0 ? await this.captureScreenshot(page, "desktop") : undefined;
      const screenshotMobile = depth === 0 ? await this.captureScreenshot(page, "mobile") : undefined;

      return {
        url,
        title,
        metaDescription,
        statusCode,
        loadTimeMs,
        wordCount,
        headings,
        images,
        links,
        forms,
        structuredData,
        metaTags,
        consoleErrors,
        rawHtml: html,
        screenshotDesktop,
        screenshotMobile,
      };
    } catch (err) {
      console.error(`[crawler] Failed to visit ${url}:`, err);
      return null;
    } finally {
      await page.close().catch(() => null);
    }
  }

  private async captureScreenshot(
    page: Page,
    viewport: "desktop" | "mobile"
  ): Promise<string | undefined> {
    try {
      if (viewport === "mobile") {
        await page.setViewportSize({ width: 390, height: 844 });
      } else {
        await page.setViewportSize({ width: 1440, height: 900 });
      }

      const buffer = await page.screenshot({
        fullPage: false, // clip to viewport — faster than full-page
        type: "jpeg",
        quality: 75,
        timeout: PAGE_TIMEOUT_MS,
      });

      // Return as base64 data URI for in-memory use
      // In production this would be uploaded to S3/Supabase Storage
      return `data:image/jpeg;base64,${buffer.toString("base64")}`;
    } catch {
      return undefined;
    }
  }

  private extractHeadings($: cheerio.CheerioAPI): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const tag of ["h1", "h2", "h3", "h4", "h5", "h6"]) {
      const texts: string[] = [];
      $(tag).each((_, el) => {
        const text = $(el).text().trim();
        if (text) texts.push(text);
      });
      if (texts.length > 0) result[tag] = texts;
    }
    return result;
  }

  private extractImages($: cheerio.CheerioAPI, baseUrl: string): ImageData[] {
    const images: ImageData[] = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src");
      if (!src) return;
      images.push({
        src: resolveUrl(baseUrl, src) ?? src,
        alt: $(el).attr("alt") ?? null,
        width: parseInt($(el).attr("width") ?? "", 10) || null,
        height: parseInt($(el).attr("height") ?? "", 10) || null,
      });
    });
    return images;
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): LinkData[] {
    const links: LinkData[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const resolved = resolveUrl(baseUrl, href);
      if (!resolved) return;
      links.push({
        href: resolved,
        text: $(el).text().trim(),
        isExternal: !isSameOrigin(baseUrl, resolved),
        isBroken: false, // determined by link checker later
      });
    });
    return links;
  }

  private extractForms($: cheerio.CheerioAPI): FormData[] {
    const forms: FormData[] = [];
    $("form").each((_, formEl) => {
      const fields: FormField[] = [];
      $(formEl)
        .find("input, textarea, select")
        .each((_, fieldEl) => {
          const id = $(fieldEl).attr("id");
          const hasLabel =
            !!id && $(`label[for="${id}"]`).length > 0;
          fields.push({
            type: $(fieldEl).attr("type") ?? $(fieldEl).prop("tagName")?.toLowerCase() ?? "text",
            name: $(fieldEl).attr("name") ?? null,
            id: id ?? null,
            placeholder: $(fieldEl).attr("placeholder") ?? null,
            required: $(fieldEl).is("[required]"),
            hasLabel,
          });
        });

      const hasLabels = fields.every((f) => f.hasLabel);
      forms.push({
        action: $(formEl).attr("action") ?? null,
        method: $(formEl).attr("method") ?? "get",
        fields,
        hasLabels,
      });
    });
    return forms;
  }

  private extractMetaTags($: cheerio.CheerioAPI): MetaTag[] {
    const tags: MetaTag[] = [];
    $("meta").each((_, el) => {
      tags.push({
        name: $(el).attr("name"),
        property: $(el).attr("property"),
        content: $(el).attr("content"),
      });
    });
    return tags;
  }

  private extractStructuredData($: cheerio.CheerioAPI): object[] {
    const data: object[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html() ?? "");
        data.push(parsed);
      } catch {
        // malformed JSON-LD – skip
      }
    });
    return data;
  }

  private priorityScore(url: string): number {
    let score = 0;
    for (const pattern of PRIORITY_PATTERNS) {
      if (pattern.test(url)) score++;
    }
    return score;
  }
}
