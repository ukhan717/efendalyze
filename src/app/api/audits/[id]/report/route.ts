import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/client";

// GET /api/audits/[id]/report — get the generated report
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
    select: {
      userId: true,
      url: true,
      status: true,
      createdAt: true,
      completedAt: true,
      report: true,
      scores: true,
      _count: { select: { issues: true, pages: true } },
    },
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }
  if (audit.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (audit.status !== "COMPLETED") {
    return NextResponse.json({ error: "Audit is not yet complete" }, { status: 409 });
  }
  if (!audit.report) {
    return NextResponse.json({ error: "Report not available" }, { status: 404 });
  }

  return NextResponse.json({
    url: audit.url,
    createdAt: audit.createdAt,
    completedAt: audit.completedAt,
    issueCount: audit._count.issues,
    pageCount: audit._count.pages,
    scores: audit.scores,
    report: audit.report,
  });
}
