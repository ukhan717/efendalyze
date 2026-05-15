import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/client";

// GET /api/audits/[id]/status — lightweight polling endpoint
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
      id: true,
      status: true,
      progress: true,
      errorMessage: true,
      completedAt: true,
      userId: true,
    },
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }
  if (audit.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: audit.id,
    status: audit.status,
    progress: audit.progress,
    errorMessage: audit.errorMessage,
    completedAt: audit.completedAt,
  });
}
