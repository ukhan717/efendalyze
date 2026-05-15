import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/client";

// GET /api/audits/[id] — get full audit details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const audit = await prisma.audit.findUnique({
    where: { id },
    include: {
      pages: {
        select: {
          id: true,
          url: true,
          title: true,
          statusCode: true,
          loadTimeMs: true,
          wordCount: true,
          screenshotDesktop: true,
          screenshotMobile: true,
          fcp: true,
          lcp: true,
          cls: true,
          performanceScore: true,
        },
      },
      issues: {
        orderBy: [{ severity: "asc" }, { category: "asc" }],
      },
      scores: true,
      report: true,
    },
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  if (audit.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(audit);
}

// DELETE /api/audits/[id] — delete an audit
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const audit = await prisma.audit.findUnique({ where: { id } });
  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }
  if (audit.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.audit.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
