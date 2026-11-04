import { ModuleDef } from '../../../common/crud/types';

export const grcModules: ModuleDef[] = [
  {
    key: 'findings',
    model: 'auditFinding',
    labelKey: 'nav.findings',
    permission: 'findings',
    fields: [
      { name: 'code', type: 'text', readOnly: true },
      { name: 'title', type: 'text', required: true, searchable: true },
      { name: 'description', type: 'textarea' },
      { name: 'severity', type: 'select', optionPrefix: 'status', options: ['low', 'medium', 'high', 'critical'] },
      { name: 'ownerId', type: 'user', ref: 'users' },
      { name: 'deadline', type: 'date' },
      { name: 'status', type: 'select', optionPrefix: 'status', options: ['open', 'in_progress', 'remediated', 'accepted', 'closed'] },
      { name: 'source', type: 'select', options: ['internal_audit', 'external_audit', 'self_assessment', 'incident', 'regulator'] },
      { name: 'auditType', type: 'select', options: ['internal', 'external', 'certification'] },
      { name: 'controlId', type: 'select', ref: 'controls' },
    ],
    listFields: ['code', 'title', 'severity', 'deadline', 'status'],
    searchFields: ['code', 'title', 'description'],
    defaultSort: { field: 'createdAt', dir: 'desc' },
    codePrefix: 'FND',
  },
  {
    key: 'policies',
    model: 'policy',
    labelKey: 'nav.policies',
    permission: 'policies',
    fields: [
      { name: 'code', type: 'text', readOnly: true },
      { name: 'title', type: 'text', required: true, searchable: true },
      { name: 'category', type: 'select', options: ['governance', 'security', 'hr', 'privacy', 'operations', 'it', 'finance'] },
      { name: 'ownerId', type: 'user', ref: 'users' },
      {
        name: 'status',
        type: 'select',
        optionPrefix: 'status',
        options: ['draft', 'review', 'approved', 'published', 'under_review', 'deprecated'],
      },
      { name: 'version', type: 'text' },
      { name: 'summary', type: 'textarea' },
      { name: 'content', type: 'textarea' },
      { name: 'effectiveDate', type: 'date' },
      { name: 'nextReviewDate', type: 'date' },
      { name: 'requiresAck', type: 'boolean' },
      { name: 'approvedBy', type: 'user', ref: 'users', readOnly: true },
      { name: 'approvedAt', type: 'datetime', readOnly: true },
      { name: 'publishedAt', type: 'datetime', readOnly: true },
    ],
    listFields: ['code', 'title', 'version', 'status', 'nextReviewDate'],
    searchFields: ['code', 'title', 'summary', 'content'],
    defaultSort: { field: 'title', dir: 'asc' },
    codePrefix: 'POL',
    include: { versions: { orderBy: { createdAt: 'desc' }, take: 5 }, acks: true },
    hooks: {
      beforeCreate: async (data, ctx) => {
        const next: any = { ...data, version: data.version || '1.0' };
        if (next.status === 'published') next.publishedAt = new Date();
        if (next.status === 'approved') {
          next.approvedAt = new Date();
          next.approvedBy = ctx.user?.id || null;
        }
        return next;
      },
      afterCreate: async (record, ctx) => {
        if (!record.content) return;
        await ctx.prisma.policyVersion.create({
          data: {
            policyId: record.id,
            version: record.version || '1.0',
            content: record.content,
            changeSummary: 'Initial version',
            createdBy: ctx.user?.id || null,
          },
        });
      },
      beforeUpdate: async (data, existing, ctx) => {
        const next: any = { ...data };
        if (next.status === 'published' && existing.status !== 'published') next.publishedAt = new Date();
        if (next.status === 'approved' && existing.status !== 'approved') {
          next.approvedAt = new Date();
          next.approvedBy = ctx.user?.id || null;
        }
        return next;
      },
      afterUpdate: async (record, previous, ctx) => {
        const contentChanged = previous.content !== record.content;
        const versionChanged = previous.version !== record.version;
        if (!record.content || (!contentChanged && !versionChanged)) return;
        await ctx.prisma.policyVersion.create({
          data: {
            policyId: record.id,
            version: record.version || '1.0',
            content: record.content,
            changeSummary: contentChanged ? 'Content updated' : 'Version updated',
            createdBy: ctx.user?.id || null,
          },
        });
      },
    },
  },
  {
    key: 'projects',
    model: 'project',
    labelKey: 'nav.projects',
    permission: 'projects',
    fields: [
      { name: 'name', type: 'text', required: true, searchable: true },
      { name: 'description', type: 'textarea' },
      {
        name: 'status',
        type: 'select',
        optionPrefix: 'status',
        options: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
      },
      { name: 'ownerId', type: 'user', ref: 'users' },
      { name: 'startDate', type: 'date' },
      { name: 'endDate', type: 'date' },
      { name: 'progress', type: 'int' },
    ],
    listFields: ['name', 'status', 'ownerId', 'endDate', 'progress'],
    searchFields: ['name', 'description'],
    defaultSort: { field: 'createdAt', dir: 'desc' },
    include: { tasks: { orderBy: { position: 'asc' } } },
  },
  {
    key: 'tasks',
    model: 'task',
    labelKey: 'nav.projects',
    permission: 'projects',
    fields: [
      { name: 'projectId', type: 'select', ref: 'projects', required: true },
      { name: 'title', type: 'text', required: true, searchable: true },
      { name: 'description', type: 'textarea' },
      { name: 'assigneeId', type: 'user', ref: 'users' },
      { name: 'dueDate', type: 'date' },
      { name: 'status', type: 'select', optionPrefix: 'status', options: ['todo', 'in_progress', 'blocked', 'done'] },
      { name: 'priority', type: 'select', optionPrefix: 'status', options: ['low', 'medium', 'high', 'critical'] },
      { name: 'position', type: 'int' },
    ],
    listFields: ['title', 'projectId', 'assigneeId', 'dueDate', 'status', 'priority'],
    searchFields: ['title', 'description'],
    defaultSort: { field: 'position', dir: 'asc' },
  },
  {
    key: 'incidents',
    model: 'incident',
    labelKey: 'nav.incidents',
    permission: 'incidents',
    fields: [
      { name: 'code', type: 'text', readOnly: true },
      { name: 'title', type: 'text', required: true, searchable: true },
      { name: 'description', type: 'textarea' },
      { name: 'category', type: 'select', options: ['security', 'privacy', 'availability', 'fraud', 'compliance', 'other'] },
      { name: 'severity', type: 'select', optionPrefix: 'status', options: ['low', 'medium', 'high', 'critical'] },
      {
        name: 'status',
        type: 'select',
        optionPrefix: 'status',
        options: ['detected', 'classified', 'investigating', 'contained', 'closed'],
      },
      { name: 'detectedAt', type: 'datetime' },
      { name: 'ownerId', type: 'user', ref: 'users' },
      { name: 'riskId', type: 'select', ref: 'risks' },
      { name: 'lessonsLearned', type: 'textarea' },
    ],
    listFields: ['code', 'title', 'severity', 'status', 'detectedAt', 'ownerId'],
    searchFields: ['code', 'title', 'description'],
    defaultSort: { field: 'detectedAt', dir: 'desc' },
    codePrefix: 'INC',
    hooks: {
      beforeUpdate: async (data, existing) => {
        if (data.status === 'contained' && existing.status !== 'contained') return { ...data, containedAt: new Date() };
        if (data.status === 'closed' && existing.status !== 'closed') return { ...data, closedAt: new Date() };
        return data;
      },
    },
  },
  {
    key: 'compliance-mappings',
    model: 'complianceMapping',
    labelKey: 'nav.compliance',
    permission: 'compliance',
    fields: [
      { name: 'requirementId', type: 'text', required: true },
      { name: 'entityType', type: 'select', options: ['control', 'policy', 'risk', 'project', 'exception'], required: true },
      { name: 'entityId', type: 'text', required: true },
      {
        name: 'status',
        type: 'select',
        optionPrefix: 'status',
        options: ['implemented', 'partial', 'not_implemented', 'not_applicable'],
      },
      { name: 'notes', type: 'textarea' },
    ],
    listFields: ['requirementId', 'entityType', 'status', 'notes'],
    searchFields: ['entityId', 'notes'],
    defaultSort: { field: 'createdAt', dir: 'desc' },
  },
];
