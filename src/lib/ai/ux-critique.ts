import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { openai, VISION_MODEL } from "./client";
import type { PageData, AuditIssue, UXCritiqueResult } from "@/types/audit";

/**
 * Uses GPT-4o vision to perform a detailed UX/UI critique of a page.
 * Combines screenshot analysis with DOM-extracted context.
 */
export class UXCritiqueAnalyzer {
  async analyze(page: PageData): Promise<UXCritiqueResult> {
    const domContext = this.buildDomContext(page);

    const systemPrompt = `You are a senior UX/UI consultant with 15 years of experience critiquing SaaS products, 
marketing websites, and e-commerce platforms. You are known for being precise, evidence-based, and actionable.

Rules:
- Ground every critique in specific observable evidence from the screenshot or DOM
- Never fabricate issues that don't exist
- Distinguish between critical problems, recommendations, and optional enhancements
- Be direct and professional — this is a client-facing report
- Suggest concrete fixes, not vague advice like "improve the design"
- Consider conversion optimisation, trust signals, and mobile usability`;

    const userPrompt = `Analyse this webpage for UX/UI quality.

URL: ${page.url}
Page Title: ${page.title ?? "Unknown"}

DOM Context:
${domContext}

Provide your critique in JSON format with this exact structure:
{
  "visualHierarchy": "Assessment of visual hierarchy, heading structure, information flow",
  "ctaVisibility": "Assessment of CTA buttons: visibility, text, placement, contrast",
  "navigationClarity": "Assessment of navigation clarity and usability",
  "mobileUsability": "Assessment of mobile experience based on layout and viewport",
  "trustSignals": "Assessment of trust indicators: testimonials, logos, certifications, contact info",
  "conversionFlow": "Assessment of the conversion funnel and friction points",
  "overallAssessment": "Overall UX quality summary in 2-3 sentences",
  "issues": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "title": "Issue title",
      "description": "Specific description with evidence",
      "recommendation": "Concrete fix",
      "effort": "low|medium|high"
    }
  ]
}`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // Include screenshot if available (base64 data URI)
    if (page.screenshotDesktop) {
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: page.screenshotDesktop,
              detail: "low",
            },
          },
          { type: "text", text: userPrompt },
        ],
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    try {
      const response = await openai.chat.completions.create({
        model: VISION_MODEL,
        messages,
        response_format: { type: "json_object" },
        max_tokens: 3000,
        temperature: 0.3,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as UXCritiqueResult;

      // Tag all AI-generated issues
      return {
        ...parsed,
        issues: (parsed.issues ?? []).map((i) => ({
          ...i,
          category: "UX_UI" as const,
          pageUrl: page.url,
          aiGenerated: true,
        })),
      };
    } catch (err) {
      console.error("[ux-critique] AI call failed:", err);
      return this.fallbackResult(page.url);
    }
  }

  private buildDomContext(page: PageData): string {
    const lines: string[] = [];

    lines.push(`Headings: ${JSON.stringify(page.headings)}`);
    lines.push(`Links count: ${page.links.length}`);
    lines.push(`Images count: ${page.images.length}`);
    lines.push(`Forms count: ${page.forms.length}`);
    lines.push(`Word count: ${page.wordCount}`);

    const ctaKeywords = ["get started", "sign up", "buy now", "contact", "try free", "book", "schedule", "learn more"];
    const ctaLinks = page.links.filter((l) =>
      ctaKeywords.some((k) => l.text.toLowerCase().includes(k))
    );
    lines.push(`CTA links detected: ${ctaLinks.map((l) => l.text).join(", ") || "none"}`);

    const hasTestimonials =
      page.rawHtml.toLowerCase().includes("testimonial") ||
      page.rawHtml.toLowerCase().includes("review") ||
      page.rawHtml.toLowerCase().includes("stars");
    lines.push(`Testimonials/Reviews visible: ${hasTestimonials}`);

    const hasPhone =
      page.rawHtml.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/) !== null;
    lines.push(`Phone number visible: ${hasPhone}`);

    const hasAddress =
      page.rawHtml.toLowerCase().includes("address") ||
      page.rawHtml.toLowerCase().includes("street") ||
      page.rawHtml.toLowerCase().includes("city");
    lines.push(`Physical address visible: ${hasAddress}`);

    return lines.join("\n");
  }

  private fallbackResult(url: string): UXCritiqueResult {
    return {
      visualHierarchy: "Analysis unavailable.",
      ctaVisibility: "Analysis unavailable.",
      navigationClarity: "Analysis unavailable.",
      mobileUsability: "Analysis unavailable.",
      trustSignals: "Analysis unavailable.",
      conversionFlow: "Analysis unavailable.",
      overallAssessment: "AI analysis could not be completed for this page.",
      issues: [],
    };
  }
}
