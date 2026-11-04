import { ModuleDef } from '../../../common/crud/types';

export const controlFields = [
  { name: 'code', type: 'text' as const, readOnly: true },
  { name: 'name', type: 'text' as const, required: true, searchable: true },
  { name: 'description', type: 'textarea' as const },
  { name: 'objective', type: 'textarea' as const },
  { name: 'type', type: 'select' as const, options: ['preventive', 'detective', 'corrective'] },
  { name: 'category', type: 'select' as const, options: ['operational', 'security', 'compliance', 'financial', 'technical'] },
  { name: 'ownerId', type: 'user' as const, ref: 'users' },
  { name: 'businessUnitId', type: 'select' as const, ref: 'business-units' },
  { name: 'status', type: 'select' as const, optionPrefix: 'status', options: ['draft', 'active', 'under_review', 'retired'] },
  { name: 'frequency', type: 'select' as const, options: ['daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual'] },
  { name: 'implementation', type: 'select' as const, options: ['manual', 'automated', 'hybrid'] },
  { name: 'lastTestedAt', type: 'date' as const, readOnly: true },
  { name: 'nextTestAt', type: 'date' as const },
];

export const riskFields = [
  { name: 'code', type: 'text' as const, readOnly: true },
  { name: 'title', type: 'text' as const, required: true, searchable: true },
  { name: 'description', type: 'textarea' as const },
  { name: 'category', type: 'select' as const, options: ['operational', 'strategic', 'financial', 'compliance', 'security', 'technology', 'third_party'] },
  { name: 'ownerId', type: 'user' as const, ref: 'users' },
  { name: 'businessUnitId', type: 'select' as const, ref: 'business-units' },
  { name: 'assetId', type: 'select' as const, ref: 'assets' },
  { name: 'likelihood', type: 'int' as const, options: ['1', '2', '3', '4', '5'], required: true },
  { name: 'impact', type: 'int' as const, options: ['1', '2', '3', '4', '5'], required: true },
  { name: 'score', type: 'int' as const, readOnly: true },
  { name: 'residualLikelihood', type: 'int' as const, options: ['1', '2', '3', '4', '5'] },
  { name: 'residualImpact', type: 'int' as const, options: ['1', '2', '3', '4', '5'] },
  { name: 'residualScore', type: 'int' as const, readOnly: true },
  { name: 'treatment', type: 'select' as const, options: ['mitigate', 'accept', 'avoid', 'transfer'] },
  { name: 'treatmentPlan', type: 'textarea' as const },
  {
    name: 'status',
    type: 'select' as const,
    optionPrefix: 'status',
    options: ['identified', 'assessed', 'treated', 'monitored', 'closed'],
  },
  { name: 'reviewDate', type: 'date' as const },
  { name: 'nextReviewDate', type: 'date' as const },
];

export const orgModules: ModuleDef[] = [
  {
    key: 'business-units',
    model: 'businessUnit',
    labelKey: 'nav.businessUnits',
    permission: 'businessUnits',
    fields: [
      { name: 'name', type: 'text', required: true, searchable: true },
      { name: 'code', type: 'text', searchable: true },
      { name: 'parentId', type: 'select', ref: 'business-units' },
      { name: 'managerId', type: 'user', ref: 'users' },
      { name: 'status', type: 'select', optionPrefix: 'status', options: ['active', 'inactive'] },
      { name: 'description', type: 'textarea' },
    ],
    listFields: ['name', 'code', 'managerId', 'status'],
    searchFields: ['name', 'code', 'description'],
    defaultSort: { field: 'name', dir: 'asc' },
  },
  {
    key: 'assets',
    model: 'asset',
    labelKey: 'nav.assets',
    permission: 'assets',
    fields: [
      { name: 'name', type: 'text', required: true, searchable: true },
      { name: 'code', type: 'text', searchable: true },
      { name: 'type', type: 'select', options: ['information', 'system', 'service', 'facility', 'people', 'supplier'] },
      { name: 'classification', type: 'select', options: ['public', 'internal', 'confidential', 'restricted'] },
      { name: 'criticality', type: 'select', optionPrefix: 'status', options: ['low', 'medium', 'high', 'critical'] },
      { name: 'ownerId', type: 'user', ref: 'users' },
      { name: 'businessUnitId', type: 'select', ref: 'business-units' },
      { name: 'vendorId', type: 'select', ref: 'vendors' },
      { name: 'status', type: 'select', optionPrefix: 'status', options: ['active', 'inactive'] },
      { name: 'description', type: 'textarea' },
    ],
    listFields: ['name', 'code', 'type', 'classification', 'criticality', 'status'],
    searchFields: ['name', 'code', 'description'],
    defaultSort: { field: 'name', dir: 'asc' },
  },
  {
    key: 'vendors',
    model: 'vendor',
    labelKey: 'nav.vendors',
    permission: 'vendors',
    fields: [
      { name: 'name', type: 'text', required: true, searchable: true },
      { name: 'code', type: 'text', searchable: true },
      { name: 'type', type: 'select', options: ['supplier', 'service_provider', 'cloud', 'consultant', 'other'] },
      { name: 'contactName', type: 'text' },
      { name: 'contactEmail', type: 'text' },
      { name: 'website', type: 'text' },
      { name: 'country', type: 'text' },
      { name: 'riskLevel', type: 'select', optionPrefix: 'status', options: ['low', 'medium', 'high', 'critical'] },
      { name: 'status', type: 'select', optionPrefix: 'status', options: ['active', 'inactive', 'under_review'] },
      { name: 'reviewDate', type: 'date' },
      { name: 'description', type: 'textarea' },
    ],
    listFields: ['name', 'type', 'riskLevel', 'reviewDate', 'status'],
    searchFields: ['name', 'code', 'contactName', 'contactEmail'],
    defaultSort: { field: 'name', dir: 'asc' },
  },
  {
    key: 'controls',
    model: 'control',
    labelKey: 'nav.controls',
    permission: 'controls',
    fields: controlFields,
    listFields: ['code', 'name', 'type', 'ownerId', 'status', 'nextTestAt'],
    searchFields: ['code', 'name', 'description'],
    defaultSort: { field: 'code', dir: 'asc' },
    codePrefix: 'CTL',
    include: { tests: { orderBy: { testedAt: 'desc' }, take: 5 } },
  },
  {
    key: 'control-tests',
    model: 'controlTest',
    labelKey: 'nav.controlTests',
    permission: 'controls',
    fields: [
      { name: 'controlId', type: 'select', ref: 'controls', required: true },
      { name: 'title', type: 'text', required: true, searchable: true },
      { name: 'testedById', type: 'user', ref: 'users' },
      { name: 'testedAt', type: 'date' },
      { name: 'result', type: 'select', optionPrefix: 'status', options: ['pass', 'fail', 'partial', 'pending'] },
      { name: 'status', type: 'select', optionPrefix: 'status', options: ['pending', 'completed'] },
      { name: 'evidenceFileIds', type: 'stringList' },
      { name: 'notes', type: 'textarea' },
    ],
    listFields: ['title', 'controlId', 'testedAt', 'result', 'status'],
    searchFields: ['title', 'notes'],
    defaultSort: { field: 'testedAt', dir: 'desc' },
    hooks: {
      afterCreate: async (record, ctx) => {
        const control = await ctx.prisma.control.findFirst({ where: { id: record.controlId } });
        if (!control) return;
        const frequencyDays: Record<string, number> = {
          daily: 1,
          weekly: 7,
          monthly: 30,
          quarterly: 90,
          semiannual: 180,
          annual: 365,
        };
        const days = frequencyDays[control.frequency] || 90;
        await ctx.prisma.control.update({
          where: { id: control.id },
          data: {
            lastTestedAt: record.testedAt || new Date(),
            nextTestAt: new Date(Date.now() + days * 24 * 3600 * 1000),
          },
        });
      },
    },
  },
  {
    key: 'risks',
    model: 'risk',
    labelKey: 'nav.risks',
    permission: 'risks',
    fields: riskFields,
    listFields: ['code', 'title', 'category', 'score', 'residualScore', 'treatment', 'status'],
    searchFields: ['code', 'title', 'description'],
    defaultSort: { field: 'score', dir: 'desc' },
    codePrefix: 'RSK',
    include: { reviews: { orderBy: { reviewedAt: 'desc' }, take: 5 } },
    computed: (record) => ({
      score: (Number(record.likelihood) || 0) * (Number(record.impact) || 0),
      residualScore: (Number(record.residualLikelihood) || 0) * (Number(record.residualImpact) || 0),
    }),
    hooks: {
      beforeCreate: async (data, ctx) => {
        const matrix = await ctx.prisma.riskMatrix.findFirst({ where: { isDefault: true } });
        const appetite = matrix?.appetite ?? 12;
        const score = (Number(data.likelihood) || 3) * (Number(data.impact) || 3);
        const residual =
          (Number(data.residualLikelihood) || Number(data.likelihood) || 3) *
          (Number(data.residualImpact) || Number(data.impact) || 3);
        return { ...data, score, residualScore: residual, appetiteExceeded: score > appetite };
      },
      beforeUpdate: async (data, existing, ctx) => {
        const likelihood = Number(data.likelihood ?? existing.likelihood) || 3;
        const impact = Number(data.impact ?? existing.impact) || 3;
        const residualLikelihood = Number(data.residualLikelihood ?? existing.residualLikelihood) || 3;
        const residualImpact = Number(data.residualImpact ?? existing.residualImpact) || 3;
        const matrix = await ctx.prisma.riskMatrix.findFirst({ where: { isDefault: true } });
        const appetite = matrix?.appetite ?? 12;
        const score = likelihood * impact;
        return {
          ...data,
          score,
          residualScore: residualLikelihood * residualImpact,
          appetiteExceeded: score > appetite,
        };
      },
    },
  },
];
