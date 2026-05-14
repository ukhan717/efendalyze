-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('PENDING', 'CRAWLING', 'ANALYZING', 'GENERATING_REPORT', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('SEO', 'ACCESSIBILITY', 'PERFORMANCE', 'UX_UI', 'CONTENT', 'SECURITY', 'MOBILE', 'BRANDING', 'BUGS', 'TRUST');

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "crawlDepth" INTEGER NOT NULL DEFAULT 3,
    "maxPages" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPage" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "metaDescription" TEXT,
    "statusCode" INTEGER,
    "loadTimeMs" INTEGER,
    "wordCount" INTEGER,
    "headings" JSONB,
    "images" JSONB,
    "links" JSONB,
    "forms" JSONB,
    "structuredData" JSONB,
    "metaTags" JSONB,
    "consoleErrors" JSONB,
    "screenshotDesktop" TEXT,
    "screenshotMobile" TEXT,
    "fcp" DOUBLE PRECISION,
    "lcp" DOUBLE PRECISION,
    "cls" DOUBLE PRECISION,
    "tti" DOUBLE PRECISION,
    "tbt" DOUBLE PRECISION,
    "performanceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditIssue" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "pageId" TEXT,
    "category" "IssueCategory" NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "element" TEXT,
    "screenshotUrl" TEXT,
    "wcagCriteria" TEXT,
    "impact" TEXT,
    "effort" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditScore" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "seo" DOUBLE PRECISION NOT NULL,
    "accessibility" DOUBLE PRECISION NOT NULL,
    "performance" DOUBLE PRECISION NOT NULL,
    "uxUi" DOUBLE PRECISION NOT NULL,
    "content" DOUBLE PRECISION NOT NULL,
    "trust" DOUBLE PRECISION NOT NULL,
    "mobile" DOUBLE PRECISION NOT NULL,
    "quickWins" JSONB,
    "criticalIssues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditReport" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "methodology" TEXT NOT NULL,
    "keyFindings" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "aiInsights" JSONB,
    "pdfUrl" TEXT,
    "htmlUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Audit_userId_createdAt_idx" ON "Audit"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Audit_status_idx" ON "Audit"("status");

-- CreateIndex
CREATE INDEX "AuditPage_auditId_idx" ON "AuditPage"("auditId");

-- CreateIndex
CREATE INDEX "AuditIssue_auditId_severity_idx" ON "AuditIssue"("auditId", "severity");

-- CreateIndex
CREATE INDEX "AuditIssue_auditId_category_idx" ON "AuditIssue"("auditId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "AuditScore_auditId_key" ON "AuditScore"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditReport_auditId_key" ON "AuditReport"("auditId");

-- AddForeignKey
ALTER TABLE "AuditPage" ADD CONSTRAINT "AuditPage_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditIssue" ADD CONSTRAINT "AuditIssue_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditIssue" ADD CONSTRAINT "AuditIssue_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "AuditPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditScore" ADD CONSTRAINT "AuditScore_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditReport" ADD CONSTRAINT "AuditReport_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
