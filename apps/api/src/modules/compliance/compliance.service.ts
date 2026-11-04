import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { tenantContext } from '../../common/tenant/tenant-context';
import { badRequest, notFound } from '../../common/http/helpers';

export interface PackageImport {
  name: string;
  authority: string;
  version?: string;
  description?: string;
  sourceUrl?: string;
  chapters: { ref: string; title: string; requirements: { ref: string; title: string; category?: string }[] }[];
}

const slugify = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async packages() {
    const library = await this.prisma.db.compliancePackage.findMany({
      where: { tenantId: null },
      include: { _count: { select: { requirements: true, chapters: true } } },
      orderBy: { name: 'asc' },
    });
    const adopted = await this.prisma.db.compliancePackage.findMany({
      where: { tenantId: { not: null } },
      include: { _count: { select: { requirements: true, chapters: true } } },
      orderBy: { name: 'asc' },
    });
    return { library, adopted };
  }

  async adopt(templateId: string) {
    const template = await this.prisma.db.compliancePackage.findFirst({
      where: { id: templateId, tenantId: null },
      include: { chapters: { orderBy: { position: 'asc' } }, requirements: { orderBy: { position: 'asc' } } },
    });
    if (!template) throw notFound();
    const tenantId = tenantContext.tenantId;
    if (!tenantId) throw badRequest('errors.tenantNotFound');
    const existing = await this.prisma.db.compliancePackage.findFirst({
      where: { tenantId, slug: template.slug, version: template.version },
    });
    if (existing) return existing;

    const created = await this.prisma.db.compliancePackage.create({
      data: {
        tenantId,
        slug: template.slug,
        name: template.name,
        authority: template.authority,
        version: template.version,
        description: template.description,
        sourceUrl: template.sourceUrl,
        isTemplate: false,
      },
    });
    const chapterMap = new Map<string, string>();
    for (const chapter of template.chapters) {
      const copy = await this.prisma.db.complianceChapter.create({
        data: {
          packageId: created.id,
          ref: chapter.ref,
          title: chapter.title,
          description: chapter.description,
          position: chapter.position,
        },
      });
      chapterMap.set(chapter.id, copy.id);
    }
    for (const requirement of template.requirements) {
      await this.prisma.db.complianceRequirement.create({
        data: {
          packageId: created.id,
          chapterId: requirement.chapterId ? chapterMap.get(requirement.chapterId) || null : null,
          ref: requirement.ref,
          title: requirement.title,
          description: requirement.description,
          category: requirement.category,
          position: requirement.position,
        },
      });
    }
    await this.audit.log({
      action: 'create',
      module: 'compliance',
      entity: 'package',
      entityId: created.id,
      after: { name: created.name, authority: created.authority },
    });
    return created;
  }

  async analysis(packageId: string) {
    const pkg = await this.prisma.db.compliancePackage.findFirst({
      where: { id: packageId },
      include: {
        chapters: { orderBy: { position: 'asc' } },
        requirements: { orderBy: { position: 'asc' } },
      },
    });
    if (!pkg) throw notFound();
    const requirementIds = pkg.requirements.map((r) => r.id);
    const mappings = requirementIds.length
      ? await this.prisma.db.complianceMapping.findMany({ where: { requirementId: { in: requirementIds } } })
      : [];
    const byRequirement = new Map<string, typeof mappings>();
    for (const mapping of mappings) {
      const list = byRequirement.get(mapping.requirementId) || [];
      list.push(mapping);
      byRequirement.set(mapping.requirementId, list);
    }
    const scoreOf = (ids: string[]) => {
      const mapped = ids.filter((id) => byRequirement.has(id));
      const points = mapped.reduce((acc, id) => {
        const best = byRequirement.get(id)!.sort((a, b) => this.weight(b.status) - this.weight(a.status))[0];
        return acc + this.weight(best.status);
      }, 0);
      return {
        requirements: ids.length,
        mapped: mapped.length,
        score: ids.length ? Math.round((points / ids.length) * 100) : 0,
      };
    };

    const chapters = pkg.chapters.map((chapter) => {
      const ids = pkg.requirements.filter((r) => r.chapterId === chapter.id).map((r) => r.id);
      return { ...chapter, ...scoreOf(ids) };
    });
    const totals = scoreOf(requirementIds);
    return {
      package: {
        id: pkg.id,
        name: pkg.name,
        authority: pkg.authority,
        version: pkg.version,
        description: pkg.description,
      },
      ...totals,
      chapters,
      unmapped: pkg.requirements
        .filter((r) => !byRequirement.has(r.id))
        .map((r) => ({ id: r.id, ref: r.ref, title: r.title, category: r.category })),
    };
  }

  private weight(status: string) {
    if (status === 'implemented') return 1;
    if (status === 'partial') return 0.5;
    if (status === 'not_applicable') return 1;
    return 0;
  }

  async requirements(packageId: string, q?: string, page = 1, pageSize = 50) {
    const where: any = { packageId };
    if (q) {
      where.OR = [
        { ref: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [total, requirements] = await Promise.all([
      this.prisma.db.complianceRequirement.count({ where }),
      this.prisma.db.complianceRequirement.findMany({
        where,
        orderBy: [{ position: 'asc' }, { ref: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { chapter: { select: { ref: true, title: true } } },
      }),
    ]);
    const requirementIds = requirements.map((r) => r.id);
    const mappings = requirementIds.length
      ? await this.prisma.db.complianceMapping.findMany({ where: { requirementId: { in: requirementIds } } })
      : [];
    const controlIds = mappings.filter((m) => m.entityType === 'control').map((m) => m.entityId);
    const policyIds = mappings.filter((m) => m.entityType === 'policy').map((m) => m.entityId);
    const [controls, policies] = await Promise.all([
      controlIds.length
        ? this.prisma.db.control.findMany({ where: { id: { in: controlIds } }, select: { id: true, code: true, name: true } })
        : [],
      policyIds.length
        ? this.prisma.db.policy.findMany({ where: { id: { in: policyIds } }, select: { id: true, code: true, title: true } })
        : [],
    ]);
    const labels = new Map<string, string>();
    controls.forEach((c) => labels.set(c.id, `${c.code} ${c.name}`));
    policies.forEach((p) => labels.set(p.id, `${p.code} ${p.title}`));
    return {
      total,
      page,
      pageSize,
      items: requirements.map((requirement) => ({
        ...requirement,
        mappings: mappings
          .filter((m) => m.requirementId === requirement.id)
          .map((m) => ({ ...m, entityLabel: labels.get(m.entityId) || m.entityId })),
      })),
    };
  }

  async map(body: {
    requirementId: string;
    entityType: string;
    entityId: string;
    status?: string;
    notes?: string;
  }) {
    const tenantId = tenantContext.tenantId;
    if (!tenantId) throw badRequest('errors.tenantNotFound');
    const requirement = await this.prisma.db.complianceRequirement.findFirst({ where: { id: body.requirementId } });
    if (!requirement) throw notFound();
    const existing = await this.prisma.db.complianceMapping.findFirst({
      where: {
        requirementId: body.requirementId,
        entityType: body.entityType,
        entityId: body.entityId,
      },
    });
    if (existing) {
      return this.prisma.db.complianceMapping.update({
        where: { id: existing.id },
        data: { status: body.status || existing.status, notes: body.notes ?? existing.notes },
      });
    }
    const created = await this.prisma.db.complianceMapping.create({
      data: {
        tenantId,
        requirementId: body.requirementId,
        entityType: body.entityType,
        entityId: body.entityId,
        status: body.status || 'implemented',
        notes: body.notes || null,
        mappedBy: tenantContext.get()?.userId || null,
      },
    });
    await this.audit.log({
      action: 'create',
      module: 'compliance',
      entity: 'mapping',
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async unmap(id: string) {
    const mapping = await this.prisma.db.complianceMapping.findFirst({ where: { id } });
    if (!mapping) throw notFound();
    await this.prisma.db.complianceMapping.delete({ where: { id } });
    return { ok: true, id };
  }

  async importPackage(payload: PackageImport) {
    const tenantId = tenantContext.tenantId;
    if (!tenantId) throw badRequest('errors.tenantNotFound');
    if (!payload?.name || !Array.isArray(payload.chapters)) throw badRequest('errors.validation');
    const slug = slugify(payload.name);
    const created = await this.prisma.db.compliancePackage.create({
      data: {
        tenantId,
        slug,
        name: payload.name,
        authority: payload.authority || 'CUSTOM',
        version: payload.version || '1.0',
        description: payload.description || null,
        sourceUrl: payload.sourceUrl || null,
        isTemplate: false,
      },
    });
    let chapterPos = 0;
    let total = 0;
    for (const chapter of payload.chapters) {
      const chapterRow = await this.prisma.db.complianceChapter.create({
        data: {
          packageId: created.id,
          ref: chapter.ref || String(chapterPos + 1),
          title: chapter.title || chapter.ref || `Chapter ${chapterPos + 1}`,
          position: chapterPos++,
        },
      });
      let reqPos = 0;
      for (const requirement of chapter.requirements || []) {
        await this.prisma.db.complianceRequirement.create({
          data: {
            packageId: created.id,
            chapterId: chapterRow.id,
            ref: requirement.ref || `${chapterRow.ref}.${reqPos + 1}`,
            title: requirement.title || requirement.ref || 'Requirement',
            category: requirement.category || null,
            position: reqPos++,
          },
        });
        total += 1;
      }
    }
    await this.audit.log({
      action: 'import',
      module: 'compliance',
      entity: 'package',
      entityId: created.id,
      after: { name: created.name, requirements: total },
    });
    return { ...created, requirements: total };
  }
}
