import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/client";
import AuditHistoryTable from "@/components/audit/audit-history-table";

export default async function AuditsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const audits = await prisma.audit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      scores: { select: { overall: true } },
      _count: { select: { issues: true, pages: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Audits</h1>
        <p className="mt-1 text-sm text-gray-500">
          {audits.length} audit{audits.length !== 1 ? "s" : ""} total
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <AuditHistoryTable audits={audits as never} />
      </div>
    </div>
  );
}
