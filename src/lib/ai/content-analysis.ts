import { openai, TEXT_MODEL } from "./client";
import type { PageData, AuditIssue, ContentAnalysisResult } from "@/types/audit";

/**
 * Uses GPT-4o to analyse content quality, brand messaging, and copywriting.
 */
export class ContentAnalyzer {
  async analyze(page: PageData): Promise<ContentAnalysisResult> {
    // Extract visible text content from headings and meaningful content areas
    const textContent = this.extractTextContent(page);

    if (textContent.length < 50) {
      return {
        messagingClarity: "Insufficient content to analyse.",
        toneConsistency: "Insufficient content to analyse.",
        valuePropClarity: "Insufficient content to analyse.",
        ctaEffectiveness: "Insufficient content to analyse.",
        issues: [],
      };
    }

    const systemPrompt = `You are a senior copywriter and brand strategist specialising in B2B/B2C digital marketing.
You critically evaluate website content for clarity, persuasiveness, professionalism, and conversion effectiveness.

Rules:
- Cite specific examples from the content provided
- Be precise — avoid generic advice
- Suggest improved copy where it would add value
- Distinguish between critical messaging failures and minor improvement opportunities`;

    const userPrompt = `Analyse the website content below for quality and effectiveness.

URL: ${page.url}
Page Title: ${page.title ?? "No title"}
Meta Description: ${page.metaDescription ?? "None"}

Content:
---
${textContent}
---

Return analysis as JSON with this structure:
{
  "messagingClarity": "Is the primary message immediately clear? Evidence and assessment.",
  "toneConsistency": "Is the tone consistent and professional throughout?",
  "valuePropClarity": "How clearly is the value proposition communicated?",
  "ctaEffectiveness": "Are the calls-to-action compelling and specific?",
  "issues": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "title": "Issue title",
      "description": "Specific issue with quoted evidence",
      "recommendation": "Concrete improvement, include rewritten example where helpful",
      "effort": "low|medium|high"
    }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.3,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as ContentAnalysisResult;

      return {
        ...parsed,
        issues: (parsed.issues ?? []).map((i) => ({
          ...i,
          category: "CONTENT" as const,
          pageUrl: page.url,
          aiGenerated: true,
        })),
      };
    } catch (err) {
      console.error("[content-analysis] AI call failed:", err);
      return {
        messagingClarity: "Analysis unavailable.",
        toneConsistency: "Analysis unavailable.",
        valuePropClarity: "Analysis unavailable.",
        ctaEffectiveness: "Analysis unavailable.",
        issues: [],
      };
    }
  }

  private extractTextContent(page: PageData): string {
    const parts: string[] = [];

    // Headings
    for (const [tag, texts] of Object.entries(page.headings)) {
      for (const text of texts) {
        parts.push(`[${tag.toUpperCase()}] ${text}`);
      }
    }

    // CTA links
    const ctaKeywords = ["get started", "sign up", "buy", "contact", "try", "book", "schedule", "learn more", "explore"];
    const ctaLinks = page.links.filter((l) =>
      ctaKeywords.some((k) => l.text.toLowerCase().includes(k))
    );
    if (ctaLinks.length > 0) {
      parts.push(`[CTAs] ${ctaLinks.map((l) => l.text).join(" | ")}`);
    }

    // Truncate to avoid hitting token limits
    return parts.join("\n").slice(0, 4000);
  }
}
