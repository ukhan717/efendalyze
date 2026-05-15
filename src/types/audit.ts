// ─── Core Audit Types ─────────────────────────────────────────────────────────

export type IssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type IssueCategory =
  | "SEO"
  | "ACCESSIBILITY"
  | "PERFORMANCE"
  | "UX_UI"
  | "CONTENT"
  | "SECURITY"
  | "MOBILE"
  | "BRANDING"
  | "BUGS"
  | "TRUST";

export type AuditStatus =
  | "PENDING"
  | "CRAWLING"
  | "ANALYZING"
  | "GENERATING_REPORT"
  | "COMPLETED"
  | "FAILED";

// ─── Crawl Types ──────────────────────────────────────────────────────────────

export interface CrawlOptions {
  url: string;
  maxPages?: number;
  maxDepth?: number;
  respectRobotsTxt?: boolean;
  includeExternalLinks?: boolean;
}

export interface PageData {
  url: string;
  title: string | null;
  metaDescription: string | null;
  statusCode: number;
  loadTimeMs: number;
  wordCount: number;
  headings: Record<string, string[]>;
  images: ImageData[];
  links: LinkData[];
  forms: FormData[];
  structuredData: object[];
  metaTags: MetaTag[];
  consoleErrors: ConsoleError[];
  rawHtml: string;
  screenshotDesktop?: string;
  screenshotMobile?: string;
  // Core Web Vitals — populated by crawler when available
  fcp?: number | null;
  lcp?: number | null;
  cls?: number | null;
  tti?: number | null;
  tbt?: number | null;
  performanceScore?: number | null;
}

export interface ImageData {
  src: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  fileSize?: number;
}

export interface LinkData {
  href: string;
  text: string;
  isExternal: boolean;
  isBroken: boolean;
  statusCode?: number;
}

export interface FormData {
  action: string | null;
  method: string;
  fields: FormField[];
  hasLabels: boolean;
}

export interface FormField {
  type: string;
  name: string | null;
  id: string | null;
  placeholder: string | null;
  required: boolean;
  hasLabel: boolean;
}

export interface MetaTag {
  name?: string;
  property?: string;
  content?: string;
}

export interface ConsoleError {
  type: "error" | "warning";
  message: string;
  source?: string;
}

// ─── Performance Types ────────────────────────────────────────────────────────

export interface PerformanceMetrics {
  fcp: number | null;   // First Contentful Paint (ms)
  lcp: number | null;   // Largest Contentful Paint (ms)
  cls: number | null;   // Cumulative Layout Shift
  tti: number | null;   // Time to Interactive (ms)
  tbt: number | null;   // Total Blocking Time (ms)
  score: number | null; // 0–100
}

// ─── Audit Issue Types ────────────────────────────────────────────────────────

export interface AuditIssue {
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  recommendation: string;
  element?: string;
  screenshotUrl?: string;
  wcagCriteria?: string;
  impact?: string;
  effort?: "low" | "medium" | "high";
  aiGenerated?: boolean;
  pageUrl?: string;
}

// ─── Score Types ──────────────────────────────────────────────────────────────

export interface AuditScores {
  overall: number;
  seo: number;
  accessibility: number;
  performance: number;
  uxUi: number;
  content: number;
  trust: number;
  mobile: number;
  quickWins: string[];
  criticalIssues: string[];
}

// ─── Report Types ─────────────────────────────────────────────────────────────

export interface AuditReport {
  executiveSummary: string;
  methodology: string;
  keyFindings: ReportFinding[];
  recommendations: ReportRecommendation[];
  aiInsights: AiInsights;
}

export interface ReportFinding {
  title: string;
  description: string;
  severity: IssueSeverity;
  category: IssueCategory;
}

export interface ReportRecommendation {
  priority: number;
  title: string;
  description: string;
  impact: string;
  effort: "low" | "medium" | "high";
  category: IssueCategory;
}

export interface AiInsights {
  uxCritique: string;
  contentAnalysis: string;
  trustAnalysis: string;
  overallAssessment: string;
  topPriorities: string[];
}

// ─── AI Analysis Types ────────────────────────────────────────────────────────

export interface UXCritiqueResult {
  visualHierarchy: string;
  ctaVisibility: string;
  navigationClarity: string;
  mobileUsability: string;
  trustSignals: string;
  conversionFlow: string;
  overallAssessment: string;
  issues: AuditIssue[];
}

export interface ContentAnalysisResult {
  messagingClarity: string;
  toneConsistency: string;
  valuePropClarity: string;
  ctaEffectiveness: string;
  issues: AuditIssue[];
}

// ─── Pipeline Types ───────────────────────────────────────────────────────────

export interface AuditJobData {
  auditId: string;
  url: string;
  userId: string;
  options: CrawlOptions;
}

export interface AuditPipelineResult {
  pages: PageData[];
  issues: AuditIssue[];
  scores: AuditScores;
  report: AuditReport;
}
