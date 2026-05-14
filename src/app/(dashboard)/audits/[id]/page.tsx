import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import AuditDetailView from "@/components/audit/audit-detail-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AuditDetailPage({ params }: Props) {
  const { userId } = await auth();
  const { id } = await params;

  const audit = await prisma.audit.findUnique({
    where: { id },
    include: {
      pages: true,
      issues: {
        orderBy: [{ severity: "asc" }, { category: "asc" }],
      },
      scores: true,
      report: true,
    },
  });

  if (!audit || audit.userId !== userId) notFound();

  return <AuditDetailView audit={audit as never} />;
}
