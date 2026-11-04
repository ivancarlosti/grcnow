import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { tenantContext } from '../../common/tenant/tenant-context';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Compliance coverage for every package visible to the tenant. */
  async complianceScores() {
    const db = this.prisma.db;
    const tenantId = tenantContext.tenantId;
    const packages = await db.compliancePackage.findMany({
      where: tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : { tenantId: { not: null } },
      include: { requirements: { select: { id: true } } },
      take: 60,
    });
    const requirements = await db.complianceRequirement.findMany({
      where: { packageId: { in: packages.map((p) => p.id) } },
      select: { id: true, packageId: true },
    });
    const packageOf = new Map(requirements.map((r) => [r.id, r.packageId]));
    const mappings = await db.complianceMapping.findMany({
      where: { requirementId: { in: requirements.map((r) => r.id) } },
      select: { requirementId: true, status: true },
    });
    const stats = new Map<string, { mapped: Set<string>; points: number }>();
    for (const mapping of mappings) {
      const packageId = packageOf.get(mapping.requirementId);
      if (!packageId) continue;
      const entry = stats.get(packageId) || { mapped: new Set<string>(), points: 0 };
      if (!entry.mapped.has(mapping.requirementId)) {
        entry.mapped.add(mapping.requirementId);
        entry.points += mapping.status === 'implemented' ? 1 : mapping.status === 'partial' ? 0.5 : 0;
      }
      stats.set(packageId, entry);
    }
    return packages
      .filter((p) => p.requirements.length > 0)
      .map((p) => {
        const entry = stats.get(p.id);
        const total = p.requirements.length;
        return {
          key: `${p.slug}:${p.version}`,
          id: p.id,
          name: p.name,
          authority: p.authority,
          version: p.version,
          owned: Boolean(p.tenantId),
          requirements: total,
          mapped: entry?.mapped.size || 0,
          score: Math.round(((entry?.points || 0) / total) * 100),
        };
      })
      .filter((p) => p.owned || p.mapped > 0)
      .reduce((acc: any[], item) => {
        if (tenantId) {
          acc.push(item);
          return acc;
        }
        // Platform view: aggregate the same framework across companies.
        const existing = acc.find((entry) => entry.key === item.key);
        if (existing) {
          existing.requirements += item.requirements;
          existing.mapped += item.mapped;
          existing.points = (existing.points || 0) + Math.round((item.score / 100) * item.requirements);
          existing.score = Math.round((existing.points / existing.requirements) * 100);
        } else {
          acc.push({ ...item, points: Math.round((item.score / 100) * item.requirements) });
        }
        return acc;
      }, [])
      .sort((a, b) => b.score - a.score);
  }

  async summary(userId?: string) {
    const db = this.prisma.db;
    const now = new Date();
    const in30 = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    const [
      risks, highRisks, controls, controlsDue, policies, policiesDue,
      incidents, openIncidents, tasks, overdueTasks, vendors, assets,
      openFindings, pendingExceptions, riskRows, matrix, activity, compliance,
      risksByCategory, controlsByStatus, myTasks, reviewRisks, reviewPolicies,
    ] = await Promise.all([
      db.risk.count(),
      db.risk.count({ where: { score: { gte: 16 } } }),
      db.control.count(),
      db.control.count({ where: { nextTestAt: { lt: now } } }),
      db.policy.count(),
      db.policy.count({ where: { nextReviewDate: { lt: now } } }),
      db.incident.count(),
      db.incident.count({ where: { status: { not: 'closed' } } }),
      db.task.count({ where: { status: { not: 'done' } } }),
      db.task.count({ where: { status: { not: 'done' }, dueDate: { lt: now } } }),
      db.vendor.count(),
      db.asset.count(),
      db.auditFinding.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      db.exceptionRecord.count({ where: { status: 'pending' } }),
      db.risk.findMany({ select: { likelihood: true, impact: true }, take: 1000 }),
      db.riskMatrix.findFirst({ where: { isDefault: true } }),
      db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
      this.complianceScores(),
      db.risk.groupBy({ by: ['category'], _count: { _all: true } }),
      db.control.groupBy({ by: ['status'], _count: { _all: true } }),
      userId
        ? db.task.findMany({
            where: { assigneeId: userId, status: { not: 'done' } },
            orderBy: { dueDate: 'asc' },
            take: 5,
          })
        : Promise.resolve([]),
      db.risk.findMany({
        where: { nextReviewDate: { lte: in30 } },
        select: { id: true, code: true, title: true, nextReviewDate: true, score: true },
        orderBy: { nextReviewDate: 'asc' },
        take: 5,
      }),
      db.policy.findMany({
        where: { nextReviewDate: { lte: in30 } },
        select: { id: true, code: true, title: true, nextReviewDate: true, status: true },
        orderBy: { nextReviewDate: 'asc' },
        take: 5,
      }),
    ]);

    const thresholds = (matrix?.thresholds as any[]) || [
      { min: 1, max: 4, level: 'low' },
      { min: 5, max: 9, level: 'medium' },
      { min: 10, max: 15, level: 'high' },
      { min: 16, max: 25, level: 'critical' },
    ];
    const cells: any[] = [];
    for (let likelihood = 5; likelihood >= 1; likelihood -= 1) {
      for (let impact = 1; impact <= 5; impact += 1) {
        const score = likelihood * impact;
        const bucket = thresholds.find((t) => score >= t.min && score <= t.max);
        cells.push({
          likelihood,
          impact,
          level: bucket?.level || 'medium',
          count: (riskRows as any[]).filter(
            (r) => Number(r.likelihood) === likelihood && Number(r.impact) === impact,
          ).length,
        });
      }
    }

    return {
      counts: {
        risks,
        highRisks,
        controls,
        controlsDue,
        policies,
        policiesDue,
        incidents,
        openIncidents,
        tasks,
        overdueTasks,
        vendors,
        assets,
        openFindings,
        pendingExceptions,
      },
      complianceScore: compliance.length
        ? Math.round(compliance.reduce((acc, item) => acc + item.score, 0) / compliance.length)
        : 0,
      compliance,
      riskMatrix: { appetite: matrix?.appetite ?? 12, thresholds, cells },
      risksByCategory: (risksByCategory as any[]).map((r) => ({ category: r.category, count: r._count._all })),
      controlsByStatus: (controlsByStatus as any[]).map((r) => ({ status: r.status, count: r._count._all })),
      recentActivity: activity,
      myTasks,
      upcomingReviews: [
        ...(reviewRisks as any[]).map((r) => ({
          type: 'risk',
          id: r.id,
          code: r.code,
          title: r.title,
          date: r.nextReviewDate,
          score: r.score,
        })),
        ...(reviewPolicies as any[]).map((p) => ({
          type: 'policy',
          id: p.id,
          code: p.code,
          title: p.title,
          date: p.nextReviewDate,
          status: p.status,
        })),
      ].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    };
  }
}
