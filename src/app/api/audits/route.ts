import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { sanitizeUrl } from "@/lib/utils/url";
import { auditQueue } from "@/workers/audit-worker";

const CreateAuditSchema = z.object({
  url: z.string().min(1).max(2048),
  maxPages: z.number().int().min(1).max(50).optional().default(20),
  maxDepth: z.number().int().min(1).max(5).optional().default(3),
  respectRobotsTxt: z.boolean().optional().default(false),
});

// POST /api/audits — create a new audit
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateAuditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  let sanitisedUrl: string;
  try {
    sanitisedUrl = sanitizeUrl(parsed.data.url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid URL" },
      { status: 422 }
    );
  }

  // Rate limit: max 5 active audits per user
  const activeCount = await prisma.audit.count({
    where: {
      userId,
      status: { in: ["PENDING", "CRAWLING", "ANALYZING", "GENERATING_REPORT"] },
    },
  });

  if (activeCount >= 5) {
    return NextResponse.json(
      { error: "Too many active audits. Please wait for existing audits to complete." },
      { status: 429 }
    );
  }

  // Create audit record
  const audit = await prisma.audit.create({
    data: {
      userId,
      url: sanitisedUrl,
      status: "PENDING",
      crawlDepth: parsed.data.maxDepth,
      maxPages: parsed.data.maxPages,
    },
  });

  // Enqueue the background job
  await auditQueue.add(
    "run-audit",
    {
      auditId: audit.id,
      url: sanitisedUrl,
      userId,
      options: {
        url: sanitisedUrl,
        maxPages: parsed.data.maxPages,
        maxDepth: parsed.data.maxDepth,
        respectRobotsTxt: parsed.data.respectRobotsTxt,
      },
    },
    { jobId: `audit-${audit.id}` }
  );

  return NextResponse.json({ id: audit.id, status: audit.status }, { status: 201 });
}

// GET /api/audits — list audits for the current user
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 10;

  const [audits, total] = await Promise.all([
    prisma.audit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        scores: { select: { overall: true } },
        _count: { select: { issues: true, pages: true } },
      },
    }),
    prisma.audit.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    audits,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
