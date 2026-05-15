import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/client";
import NewAuditForm from "@/components/audit/new-audit-form";
import AuditHistoryTable from "@/components/audit/audit-history-table";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const recentAudits = await prisma.audit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      scores: { select: { overall: true } },
      _count: { select: { issues: true, pages: true } },
    },
  });

  const stats = await prisma.audit.groupBy({
    by: ["status"],
    where: { userId },
    _count: true,
  });

  const totalAudits = stats.reduce((sum, s) => sum + s._count, 0);
  const completedAudits = stats.find((s) => s.status === "COMPLETED")?._count ?? 0;
  const avgScore = recentAudits
    .filter((a) => a.scores?.overall !== undefined)
    .reduce((sum, a, _, arr) => sum + (a.scores?.overall ?? 0) / arr.length, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-white/60">
          Analyse any website and get AI-powered recommendations.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Audits", value: totalAudits },
          { label: "Completed", value: completedAudits },
          {
            label: "Avg Score",
            value: completedAudits > 0 ? `${Math.round(avgScore)}/100` : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-medium tracking-widest uppercase text-white/60">{label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* New audit form */}
      <div className="border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-sm font-semibold tracking-widest uppercase text-white/80">Start a new audit</h2>
        <NewAuditForm />
      </div>

      {/* Recent audits */}
      {recentAudits.length > 0 && (
        <div className="border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-sm font-semibold tracking-widest uppercase text-white/80">Recent Audits</h2>
          </div>
          <AuditHistoryTable audits={recentAudits as never} />
        </div>
      )}
    </div>
  );
}
