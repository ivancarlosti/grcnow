/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/auth/password';
import { DEFAULT_ROLES } from '../src/common/constants/permissions';
import { COMPLIANCE_PACKAGES } from './data/compliance';

const prisma = new PrismaClient();

const env = {
  accountLogin: (process.env.ACCOUNT_LOGIN || 'admin@example.com').toLowerCase(),
  accountPassword: process.env.ACCOUNT_PASSWORD || 'admin123',
  defaultLocale: process.env.DEFAULT_LOCALE || 'en-US',
  seedDemo: (process.env.SEED_DEMO || 'true').toLowerCase() !== 'false',
};

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 3600 * 1000);
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3600 * 1000);

async function seedGlobal() {
  // Super Admin identity -----------------------------------------------------
  let superAdmin = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: env.accountLogin,
        name: 'Super Admin',
        passwordHash: hashPassword(env.accountPassword),
        isSuperAdmin: true,
        isCompanyAdmin: true,
        status: 'active',
        locale: env.defaultLocale,
      },
    });
    console.log(`✔ Super Admin created: ${superAdmin.email}`);
  } else if (superAdmin.email !== env.accountLogin) {
    superAdmin = await prisma.user.update({
      where: { id: superAdmin.id },
      data: { email: env.accountLogin, passwordHash: hashPassword(env.accountPassword) },
    });
    console.log(`✔ Super Admin updated: ${superAdmin.email}`);
  }

  // Global settings ---------------------------------------------------------
  const settings: Record<string, any> = {
    app_name: 'GRC Platform',
    default_locale: env.defaultLocale,
    support_email: 'support@grc.local',
    recaptcha_min_score: 0.5,
  };
  for (const [key, value] of Object.entries(settings)) {
    const existing = await prisma.setting.findFirst({ where: { tenantId: null, key } });
    if (!existing) {
      await prisma.setting.create({ data: { tenantId: null, key, value: JSON.stringify(value) } });
    }
  }
  console.log('✔ Global settings ensured');

  // Compliance library ------------------------------------------------------
  let packageCount = 0;
  for (const pkg of COMPLIANCE_PACKAGES) {
    const existing = await prisma.compliancePackage.findFirst({
      where: { slug: pkg.slug, version: pkg.version, tenantId: null },
    });
    if (existing) continue;
    const created = await prisma.compliancePackage.create({
      data: {
        tenantId: null,
        slug: pkg.slug,
        name: pkg.name,
        authority: pkg.authority,
        version: pkg.version,
        description: pkg.description,
        sourceUrl: pkg.sourceUrl || null,
        isTemplate: true,
      },
    });
    let chapterPos = 0;
    for (const chapter of pkg.chapters) {
      const ch = await prisma.complianceChapter.create({
        data: {
          packageId: created.id,
          ref: chapter.ref,
          title: chapter.title,
          description: chapter.description || null,
          position: chapterPos++,
        },
      });
      let reqPos = 0;
      for (const req of chapter.requirements) {
        await prisma.complianceRequirement.create({
          data: {
            packageId: created.id,
            chapterId: ch.id,
            ref: req.ref,
            title: req.title,
            description: req.description || null,
            category: req.category || null,
            position: reqPos++,
          },
        });
      }
    }
    packageCount += 1;
  }
  if (packageCount) console.log(`✔ ${packageCount} compliance packages imported`);

  // Notification templates (English + Portuguese, other locales fall back) --
  const templates = [
    {
      event: 'notification.riskCreated',
      subject: '[{{tenant}}] New risk registered: {{title}}',
      body: 'A new risk "{{title}}" was registered by {{actor}}. Inherent score: {{score}}.',
    },
    {
      event: 'notification.controlTestFailed',
      subject: '[{{tenant}}] Control test failed: {{title}}',
      body: 'Control test "{{title}}" failed. Review the evidence and open a remediation task.',
    },
    {
      event: 'notification.policyPublished',
      subject: '[{{tenant}}] Policy published: {{title}}',
      body: 'Policy "{{title}}" version {{version}} is now published and requires acknowledgement.',
    },
  ];
  for (const template of templates) {
    for (const locale of ['en-US', 'pt-BR']) {
      const exists = await prisma.notificationTemplate.findFirst({
        where: { tenantId: null, event: template.event, locale },
      });
      if (exists) continue;
      await prisma.notificationTemplate.create({
        data: {
          tenantId: null,
          event: template.event,
          locale,
          subject: template.subject,
          body: template.body,
        },
      });
    }
  }
  return superAdmin;
}

interface DemoCtx {
  tenantId: string;
  tenantName: string;
  users: Record<string, any>;
  businessUnits: any[];
  assets: any[];
  vendors: any[];
  controls: any[];
  risks: any[];
  policies: any[];
}

interface TenantOptions {
  name: string;
  slug: string;
  domain?: string;
  adminEmail: string;
  adminName: string;
  locale?: string;
  color?: string;
  userPrefix: string;
}

async function ensureTenant(opts: TenantOptions) {
  const existing = await prisma.tenant.findFirst({ where: { slug: opts.slug } });
  if (existing) {
    console.log(`• Tenant ${opts.slug} already present, skipping demo data`);
    return null;
  }
  const tenant = await prisma.tenant.create({
    data: {
      name: opts.name,
      slug: opts.slug,
      domain: opts.domain || null,
      defaultLocale: opts.locale || null,
      primaryColor: opts.color || '#0f766e',
      status: 'active',
      plan: 'enterprise',
    },
  });

  const roleIds = new Map<string, string>();
  for (const role of DEFAULT_ROLES) {
    const created = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        key: role.key,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isSystem: true,
      },
    });
    roleIds.set(role.key, created.id);
  }

  const password = hashPassword('Password123!');
  const userSeeds = [
    { key: 'admin', email: opts.adminEmail, name: opts.adminName, title: 'GRC Programme Lead', role: 'company_admin', admin: true },
    { key: 'manager', email: `grc.manager@${opts.userPrefix}.example.com`, name: 'Maria Oliveira', title: 'GRC Manager', role: 'grc_manager' },
    { key: 'auditor', email: `auditor@${opts.userPrefix}.example.com`, name: 'James Carter', title: 'Internal Auditor', role: 'auditor' },
    { key: 'riskOwner', email: `risk.owner@${opts.userPrefix}.example.com`, name: 'Sofia Ramos', title: 'Head of Operations', role: 'risk_owner' },
    { key: 'policyOwner', email: `policy.owner@${opts.userPrefix}.example.com`, name: 'Daniel Kim', title: 'Compliance Counsel', role: 'policy_owner' },
    { key: 'user', email: `analyst@${opts.userPrefix}.example.com`, name: 'Priya Nair', title: 'Security Analyst', role: 'regular_user' },
  ];
  const users: Record<string, any> = {};
  for (const seed of userSeeds) {
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: seed.email,
        name: seed.name,
        jobTitle: seed.title,
        passwordHash: password,
        status: 'active',
        isCompanyAdmin: Boolean(seed.admin),
        locale: opts.locale || null,
        lastLoginAt: daysAgo(Math.floor(Math.random() * 5)),
      },
    });
    await prisma.userRole.create({
      data: { tenantId: tenant.id, userId: user.id, roleId: roleIds.get(seed.role)! },
    });
    users[seed.key] = user;
  }

  await prisma.riskMatrix.create({
    data: {
      tenantId: tenant.id,
      name: 'Default 5x5',
      likelihoodScale: [1, 2, 3, 4, 5].map((value) => ({ value })),
      impactScale: [1, 2, 3, 4, 5].map((value) => ({ value })),
      thresholds: [
        { min: 1, max: 4, level: 'low', color: 'green' },
        { min: 5, max: 9, level: 'medium', color: 'amber' },
        { min: 10, max: 15, level: 'high', color: 'orange' },
        { min: 16, max: 25, level: 'critical', color: 'red' },
      ],
      appetite: 12,
      isDefault: true,
    },
  });

  await prisma.statusRule.createMany({
    data: [
      {
        tenantId: tenant.id,
        module: 'risks',
        name: 'Overdue review',
        condition: { all: [{ field: 'nextReviewDate', op: 'overdue' }] },
        statusKey: 'overdue',
        label: 'Overdue review',
        color: 'red',
        priority: 0,
      },
      {
        tenantId: tenant.id,
        module: 'risks',
        name: 'Above appetite',
        condition: { all: [{ field: 'score', op: 'gte', value: 16 }] },
        statusKey: 'above_appetite',
        label: 'Above appetite',
        color: 'amber',
        priority: 1,
      },
      {
        tenantId: tenant.id,
        module: 'policies',
        name: 'Review due',
        condition: { all: [{ field: 'nextReviewDate', op: 'overdue' }] },
        statusKey: 'review_due',
        label: 'Review due',
        color: 'amber',
        priority: 0,
      },
    ],
  });

  await prisma.customField.create({
    data: {
      tenantId: tenant.id,
      module: 'risks',
      key: 'regulatory_driver',
      label: 'Regulatory driver',
      type: 'text',
      position: 0,
      active: true,
    },
  });

  await prisma.automationRule.create({
    data: {
      tenantId: tenant.id,
      name: 'Notify owner on critical risk',
      event: 'risks.created',
      condition: 'record.score >= 16',
      action:
        "notify({ to: record.ownerId, titleKey: 'notification.riskCreated', params: { title: record.title, score: record.score } });",
      active: true,
    },
  });

  await prisma.webhook.create({
    data: {
      tenantId: tenant.id,
      name: 'GRC event stream',
      url: 'https://example.com/hooks/grc',
      events: ['risks.created', 'risks.updated', 'policies.published', 'incidents.created'],
      secret: 'demo-webhook-secret',
      active: false,
    },
  });

  console.log(`✔ Tenant ${tenant.name} created with ${userSeeds.length} users`);
  return { tenant, users } as { tenant: any; users: Record<string, any> };
}


async function seedOrganization(ctx: DemoCtx) {
  const buSeeds = [
    { name: 'Corporate', code: 'BU-CORP', description: 'Executive, finance, legal and people functions.' },
    { name: 'Technology', code: 'BU-TECH', description: 'Engineering, infrastructure and security operations.' },
    { name: 'Commercial', code: 'BU-COMM', description: 'Sales, marketing and customer success.' },
  ];
  for (const bu of buSeeds) {
    ctx.businessUnits.push(
      await prisma.businessUnit.create({
        data: {
          tenantId: ctx.tenantId,
          name: bu.name,
          code: bu.code,
          description: bu.description,
          managerId: ctx.users.manager.id,
          status: 'active',
        },
      }),
    );
  }

  const assetSeeds = [
    { name: 'Customer CRM', type: 'system', classification: 'confidential', criticality: 'critical' },
    { name: 'Production Kubernetes cluster', type: 'service', classification: 'restricted', criticality: 'critical' },
    { name: 'HR records repository', type: 'information', classification: 'confidential', criticality: 'high' },
    { name: 'Headquarters office', type: 'facility', classification: 'internal', criticality: 'medium' },
    { name: 'Employee directory', type: 'information', classification: 'internal', criticality: 'low' },
  ];
  for (const [index, asset] of assetSeeds.entries()) {
    ctx.assets.push(
      await prisma.asset.create({
        data: {
          tenantId: ctx.tenantId,
          name: asset.name,
          code: `AST-${String(index + 1).padStart(3, '0')}`,
          type: asset.type,
          classification: asset.classification,
          criticality: asset.criticality,
          ownerId: ctx.users.riskOwner.id,
          businessUnitId: ctx.businessUnits[index % ctx.businessUnits.length].id,
          description: `${asset.name} supporting core operations.`,
          status: 'active',
        },
      }),
    );
  }

  const vendorSeeds = [
    { name: 'CloudNine Hosting', type: 'cloud', riskLevel: 'critical', country: 'Ireland' },
    { name: 'SecureWorks Consulting', type: 'consultant', riskLevel: 'medium', country: 'United States' },
    { name: 'PayFlow Payments', type: 'service_provider', riskLevel: 'high', country: 'Brazil' },
  ];
  for (const vendor of vendorSeeds) {
    ctx.vendors.push(
      await prisma.vendor.create({
        data: {
          tenantId: ctx.tenantId,
          name: vendor.name,
          type: vendor.type,
          riskLevel: vendor.riskLevel,
          country: vendor.country,
          contactEmail: `contact@${vendor.name.toLowerCase().replace(/[^a-z]/g, '')}.example.com`,
          status: 'active',
          reviewDate: daysFromNow(90),
          description: `${vendor.name} provides services to the organisation.`,
        },
      }),
    );
  }
}

async function seedControlsAndRisks(ctx: DemoCtx) {
  const controlSeeds = [
    { name: 'Privileged access review', type: 'detective', status: 'active', frequency: 'quarterly', category: 'security' },
    { name: 'Vulnerability scanning', type: 'detective', status: 'active', frequency: 'monthly', category: 'technical' },
    { name: 'Security awareness training', type: 'preventive', status: 'active', frequency: 'annual', category: 'operational' },
    { name: 'Change management approval', type: 'preventive', status: 'active', frequency: 'continuous', category: 'operational' },
    { name: 'Backup restoration test', type: 'corrective', status: 'under_review', frequency: 'semiannual', category: 'technical' },
    { name: 'Third-party due diligence', type: 'preventive', status: 'active', frequency: 'annual', category: 'compliance' },
    { name: 'Encryption key rotation', type: 'preventive', status: 'active', frequency: 'annual', category: 'technical' },
    { name: 'Incident response tabletop', type: 'corrective', status: 'draft', frequency: 'semiannual', category: 'operational' },
  ];
  for (const [index, control] of controlSeeds.entries()) {
    const created = await prisma.control.create({
      data: {
        tenantId: ctx.tenantId,
        code: `CTL-${String(index + 1).padStart(4, '0')}`,
        name: control.name,
        description: `${control.name} designed to keep risk within appetite.`,
        objective: 'Maintain confidentiality, integrity and availability of information.',
        type: control.type,
        category: control.category,
        ownerId: ctx.users.riskOwner.id,
        businessUnitId: ctx.businessUnits[1].id,
        status: control.status,
        frequency: control.frequency,
        implementation: index % 3 === 0 ? 'automated' : 'manual',
        lastTestedAt: daysAgo(30 + index * 10),
        nextTestAt: daysFromNow(30 - index * 5),
      },
    });
    ctx.controls.push(created);
    if (index < 5) {
      await prisma.controlTest.create({
        data: {
          tenantId: ctx.tenantId,
          controlId: created.id,
          title: `${control.name} - quarterly test`,
          testedById: ctx.users.auditor.id,
          testedAt: daysAgo(20 + index * 5),
          result: index === 2 ? 'fail' : index === 4 ? 'partial' : 'pass',
          status: 'completed',
          notes:
            index === 2
              ? 'Two users had excessive privileges; remediation opened.'
              : 'Sample tested without exceptions.',
        },
      });
    }
  }

  const riskSeeds = [
    { title: 'Ransomware encrypts production data', category: 'security', l: 4, i: 5, rl: 2, ri: 4, treatment: 'mitigate', status: 'treated' },
    { title: 'Cloud provider outage disrupts service', category: 'technology', l: 3, i: 4, rl: 2, ri: 3, treatment: 'mitigate', status: 'monitored' },
    { title: 'Customer PII exposed through misconfiguration', category: 'compliance', l: 3, i: 5, rl: 2, ri: 4, treatment: 'mitigate', status: 'assessed' },
    { title: 'Third-party supplier fails to meet SLA', category: 'third_party', l: 3, i: 3, rl: 2, ri: 2, treatment: 'transfer', status: 'treated' },
    { title: 'Phishing compromises employee credentials', category: 'security', l: 4, i: 3, rl: 3, ri: 2, treatment: 'mitigate', status: 'monitored' },
    { title: 'Regulatory change requires product redesign', category: 'compliance', l: 2, i: 4, rl: 2, ri: 3, treatment: 'accept', status: 'identified' },
    { title: 'Key person dependency in finance', category: 'operational', l: 3, i: 3, rl: 2, ri: 2, treatment: 'mitigate', status: 'assessed' },
    { title: 'Fraudulent payment instruction', category: 'financial', l: 2, i: 5, rl: 1, ri: 3, treatment: 'avoid', status: 'closed' },
  ];
  for (const [index, risk] of riskSeeds.entries()) {
    const created = await prisma.risk.create({
      data: {
        tenantId: ctx.tenantId,
        code: `RSK-${String(index + 1).padStart(4, '0')}`,
        title: risk.title,
        description: `${risk.title}. Assessed during the annual risk workshop.`,
        category: risk.category,
        ownerId: ctx.users.riskOwner.id,
        businessUnitId: ctx.businessUnits[index % ctx.businessUnits.length].id,
        assetId: ctx.assets[index % ctx.assets.length].id,
        likelihood: risk.l,
        impact: risk.i,
        score: risk.l * risk.i,
        residualLikelihood: risk.rl,
        residualImpact: risk.ri,
        residualScore: risk.rl * risk.ri,
        treatment: risk.treatment,
        treatmentPlan: 'Implement compensating controls and monitor quarterly.',
        status: risk.status,
        appetiteExceeded: risk.l * risk.i > 12,
        reviewDate: daysAgo(15),
        nextReviewDate: index % 3 === 0 ? daysAgo(5) : daysFromNow(60 + index * 5),
        custom: index === 0 ? { regulatory_driver: 'ISO 27001 A.8.7' } : undefined,
      },
    });
    ctx.risks.push(created);
    if (index < 4) {
      await prisma.riskReview.create({
        data: {
          tenantId: ctx.tenantId,
          riskId: created.id,
          reviewerId: ctx.users.manager.id,
          reviewedAt: daysAgo(10 + index * 3),
          decision: 'accepted',
          notes: 'Treatment plan accepted; next review scheduled.',
          scoreAtReview: risk.l * risk.i,
        },
      });
    }
  }
}

async function seedPolicies(ctx: DemoCtx) {
  const policySeeds = [
    { title: 'Information Security Policy', category: 'security', status: 'published', version: '2.1', days: -30 },
    { title: 'Access Control Policy', category: 'security', status: 'approved', version: '1.4', days: 15 },
    { title: 'Data Privacy Policy', category: 'privacy', status: 'review', version: '1.0', days: 90 },
    { title: 'Business Continuity Policy', category: 'operations', status: 'draft', version: '0.9', days: 120 },
  ];
  for (const [index, policy] of policySeeds.entries()) {
    const created = await prisma.policy.create({
      data: {
        tenantId: ctx.tenantId,
        code: `POL-${String(index + 1).padStart(4, '0')}`,
        title: policy.title,
        category: policy.category,
        ownerId: ctx.users.policyOwner.id,
        status: policy.status,
        version: policy.version,
        summary: `${policy.title} establishing the rules and responsibilities for the organisation.`,
        content: `# ${policy.title}\n\n## 1. Purpose\nThis policy defines how the organisation protects its information assets.\n\n## 2. Scope\nAll employees, contractors and third parties.\n\n## 3. Responsibilities\nThe GRC Manager maintains this policy and reviews it annually.\n\n## 4. Compliance\nBreaches may lead to disciplinary action.`,
        effectiveDate: daysAgo(index === 0 ? 30 : 0),
        nextReviewDate: daysFromNow(policy.days),
        requiresAck: true,
        publishedAt: policy.status === 'published' ? daysAgo(30) : null,
        approvedAt: ['published', 'approved'].includes(policy.status) ? daysAgo(35) : null,
        approvedBy: ['published', 'approved'].includes(policy.status) ? ctx.users.admin.id : null,
      },
    });
    ctx.policies.push(created);
    await prisma.policyVersion.create({
      data: {
        tenantId: ctx.tenantId,
        policyId: created.id,
        version: policy.version,
        content: created.content,
        changeSummary: 'Initial seeded version',
        createdBy: ctx.users.policyOwner.id,
      },
    });
    if (policy.status === 'published') {
      for (const userKey of ['admin', 'manager', 'auditor', 'riskOwner']) {
        await prisma.policyAck.create({
          data: { tenantId: ctx.tenantId, policyId: created.id, userId: ctx.users[userKey].id },
        });
      }
    }
  }
}

async function seedProjects(ctx: DemoCtx) {
  const projectSeeds = [
    { name: 'ISO 27001 certification readiness', status: 'active', progress: 65, start: -60, end: 90 },
    { name: 'Privileged access cleanup', status: 'planning', progress: 20, start: -10, end: 45 },
  ];
  const tasks = [
    ['Gap assessment against Annex A', 'done', 'high'],
    ['Remediate access review findings', 'in_progress', 'critical'],
    ['Update risk treatment plans', 'in_progress', 'high'],
    ['Internal audit dry run', 'todo', 'medium'],
    ['Management review pack', 'todo', 'medium'],
    ['Inventory privileged accounts', 'in_progress', 'high'],
    ['Implement PAM tooling', 'todo', 'critical'],
  ];
  for (const [index, project] of projectSeeds.entries()) {
    const created = await prisma.project.create({
      data: {
        tenantId: ctx.tenantId,
        name: project.name,
        description: `${project.name} tracked by the GRC team.`,
        status: project.status,
        ownerId: ctx.users.manager.id,
        startDate: daysAgo(-project.start),
        endDate: daysFromNow(project.end),
        progress: project.progress,
        riskIds: ctx.risks.slice(0, 3).map((r) => r.id),
        controlIds: ctx.controls.slice(0, 2).map((c) => c.id),
      },
    });
    const projectTasks = index === 0 ? tasks.slice(0, 5) : tasks.slice(5);
    for (const [position, task] of projectTasks.entries()) {
      await prisma.task.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: created.id,
          title: task[0],
          status: task[1],
          priority: task[2],
          assigneeId: ctx.users.riskOwner.id,
          dueDate: daysFromNow(10 + position * 7),
          position,
        },
      });
    }
  }
}

async function seedOperations(ctx: DemoCtx) {
  // Exceptions --------------------------------------------------------------
  await prisma.exceptionRecord.createMany({
    data: [
      {
        tenantId: ctx.tenantId,
        code: 'EXC-0001',
        title: 'Legacy CRM lacks MFA',
        description: 'Vendor roadmap includes MFA in Q3; compensating monitoring in place.',
        ownerId: ctx.users.riskOwner.id,
        status: 'approved',
        expiresAt: daysFromNow(120),
        justification: 'Business critical system, migration planned.',
        riskId: ctx.risks[2].id,
        controlId: ctx.controls[0].id,
        approvedBy: ctx.users.admin.id,
        approvedAt: daysAgo(20),
      },
      {
        tenantId: ctx.tenantId,
        code: 'EXC-0002',
        title: 'Delayed backup restoration test',
        description: 'Awaiting new storage tier.',
        ownerId: ctx.users.manager.id,
        status: 'pending',
        expiresAt: daysFromNow(45),
        justification: 'Infrastructure change window pending.',
      },
    ],
  });

  // Incidents ---------------------------------------------------------------
  const incidents = [
    {
      code: 'INC-0001',
      title: 'Phishing campaign targeting finance',
      severity: 'high',
      status: 'investigating',
      category: 'security',
      detectedAt: daysAgo(4),
    },
    {
      code: 'INC-0002',
      title: 'CRM availability degradation',
      severity: 'medium',
      status: 'closed',
      category: 'availability',
      detectedAt: daysAgo(25),
    },
  ];
  for (const incident of incidents) {
    await prisma.incident.create({
      data: {
        tenantId: ctx.tenantId,
        ...incident,
        description: `${incident.title} handled by the incident response team.`,
        ownerId: ctx.users.manager.id,
        reportedBy: ctx.users.user.id,
        riskId: ctx.risks[0].id,
        lessonsLearned: incident.status === 'closed' ? 'Runbook updated with new escalation path.' : null,
        containedAt: incident.status === 'closed' ? daysAgo(24) : null,
        closedAt: incident.status === 'closed' ? daysAgo(23) : null,
      },
    });
  }

  // Audit findings ----------------------------------------------------------
  await prisma.auditFinding.createMany({
    data: [
      {
        tenantId: ctx.tenantId,
        code: 'FND-0001',
        title: 'Access reviews not evidenced for Q1',
        description: 'Two business units missing sign-off.',
        severity: 'high',
        ownerId: ctx.users.riskOwner.id,
        deadline: daysFromNow(14),
        status: 'in_progress',
        source: 'internal_audit',
        auditType: 'internal',
        controlId: ctx.controls[0].id,
      },
      {
        tenantId: ctx.tenantId,
        code: 'FND-0002',
        title: 'Vulnerability remediation SLA breached',
        description: 'Critical patching exceeded 30 days for 3 hosts.',
        severity: 'critical',
        ownerId: ctx.users.manager.id,
        deadline: daysFromNow(7),
        status: 'open',
        source: 'external_audit',
        auditType: 'external',
        controlId: ctx.controls[1].id,
      },
      {
        tenantId: ctx.tenantId,
        code: 'FND-0003',
        title: 'Policy acknowledgement coverage below target',
        description: '82% acknowledgement rate; target is 95%.',
        severity: 'medium',
        ownerId: ctx.users.policyOwner.id,
        deadline: daysAgo(5),
        status: 'remediated',
        source: 'self_assessment',
        auditType: 'internal',
        closedAt: daysAgo(1),
      },
    ],
  });

  // Business continuity -----------------------------------------------------
  const bcp = await prisma.businessContinuityPlan.create({
    data: {
      tenantId: ctx.tenantId,
      name: 'Customer platform continuity plan',
      description: 'Recovery procedures for the customer-facing platform.',
      businessUnitId: ctx.businessUnits[1].id,
      ownerId: ctx.users.manager.id,
      status: 'published',
      rtoHours: 4,
      rpoHours: 1,
      lastTestedAt: daysAgo(40),
      nextTestAt: daysFromNow(140),
    },
  });
  await prisma.bcpTest.create({
    data: {
      tenantId: ctx.tenantId,
      bcpId: bcp.id,
      testedAt: daysAgo(40),
      result: 'partial',
      testedBy: ctx.users.auditor.id,
      notes: 'Failover succeeded in 5h; DNS propagation slower than expected.',
    },
  });
}

async function seedPeople(ctx: DemoCtx) {
  // Assessments -------------------------------------------------------------
  const template = await prisma.assessmentTemplate.create({
    data: {
      tenantId: ctx.tenantId,
      name: 'Vendor security assessment',
      description: 'Baseline security questionnaire for new vendors.',
      entityType: 'vendor',
      status: 'active',
      questions: [
        { id: 'q1', key: 'mfa', label: 'Is MFA enforced for all administrative access?', type: 'boolean', weight: 3 },
        { id: 'q2', key: 'encryption', label: 'Is data encrypted at rest and in transit?', type: 'boolean', weight: 3 },
        { id: 'q3', key: 'incidents', label: 'Do you notify customers of incidents within 24 hours?', type: 'boolean', weight: 2 },
        { id: 'q4', key: 'certifications', label: 'Which certifications do you hold?', type: 'text', weight: 2 },
      ],
    },
  });
  await prisma.assessment.create({
    data: {
      tenantId: ctx.tenantId,
      templateId: template.id,
      name: 'CloudNine Hosting - annual review',
      targetType: 'vendor',
      targetId: ctx.vendors[0].id,
      targetEmail: 'security@cloudnine.example.com',
      status: 'sent',
      publicToken: `demo-assessment-${ctx.tenantId}`,
      sentAt: daysAgo(3),
      dueDate: daysFromNow(14),
    },
  });

  // Training ----------------------------------------------------------------
  const course = await prisma.trainingCourse.create({
    data: {
      tenantId: ctx.tenantId,
      title: 'Security awareness essentials',
      description: 'Annual awareness module covering phishing, data handling and incident reporting.',
      category: 'security',
      status: 'active',
    },
  });
  for (const userKey of ['admin', 'manager', 'auditor', 'riskOwner', 'policyOwner']) {
    await prisma.trainingAssignment.create({
      data: {
        tenantId: ctx.tenantId,
        courseId: course.id,
        userId: ctx.users[userKey].id,
        status: ['admin', 'auditor'].includes(userKey) ? 'completed' : 'assigned',
        completedAt: ['admin', 'auditor'].includes(userKey) ? daysAgo(12) : null,
        score: userKey === 'auditor' ? 95 : userKey === 'admin' ? 88 : null,
      },
    });
  }

  // Account review ----------------------------------------------------------
  const review = await prisma.accountReview.create({
    data: {
      tenantId: ctx.tenantId,
      name: 'Quarterly privileged account review',
      system: 'Production Kubernetes',
      reviewerId: ctx.users.auditor.id,
      status: 'in_progress',
      dueDate: daysFromNow(10),
      description: 'Review of all privileged accounts and service principals.',
    },
  });
  await prisma.accountReviewItem.createMany({
    data: [
      { tenantId: ctx.tenantId, reviewId: review.id, accountName: 'svc-deploy', system: 'Kubernetes', ownerName: 'DevOps', accountType: 'service', status: 'approved' },
      { tenantId: ctx.tenantId, reviewId: review.id, accountName: 'j.carter', system: 'Kubernetes', ownerName: 'James Carter', accountType: 'admin', status: 'pending' },
      { tenantId: ctx.tenantId, reviewId: review.id, accountName: 'legacy-admin', system: 'Kubernetes', ownerName: 'Unassigned', accountType: 'admin', status: 'revoked' },
    ],
  });

  // Whistleblowing ----------------------------------------------------------
  await prisma.whistleblowingReport.create({
    data: {
      tenantId: ctx.tenantId,
      token: `demo-whistle-${ctx.tenantId}`,
      category: 'fraud',
      subject: 'Suspicious expense approvals',
      message: 'Several expense reports approved without supporting receipts by the same manager.',
      status: 'triage',
      severity: 'high',
      createdAt: daysAgo(6),
    },
  });
}

async function seedPrivacy(ctx: DemoCtx) {
  await prisma.dataFlow.createMany({
    data: [
      {
        tenantId: ctx.tenantId,
        name: 'CRM to analytics warehouse',
        description: 'Customer records replicated nightly for reporting.',
        sourceType: 'internal',
        destinationType: 'internal',
        dataCategories: ['personal_data', 'contact_details'],
        personalData: true,
        transferMechanism: 'Internal network',
        country: 'Brazil',
        frequency: 'daily',
      },
      {
        tenantId: ctx.tenantId,
        name: 'Payroll to benefits provider',
        description: 'Monthly payroll data shared with the benefits provider.',
        sourceType: 'internal',
        destinationType: 'vendor',
        destinationId: ctx.vendors[2].id,
        dataCategories: ['personal_data', 'financial'],
        personalData: true,
        transferMechanism: 'SCCs',
        country: 'Brazil',
        frequency: 'monthly',
      },
    ],
  });
  await prisma.processingActivity.createMany({
    data: [
      {
        tenantId: ctx.tenantId,
        name: 'Customer support',
        purpose: 'Handle customer requests and complaints.',
        legalBasis: 'contract',
        controller: ctx.tenantName,
        dpo: 'dpo@example.com',
        dataSubjects: ['customers'],
        dataCategories: ['contact_details', 'support_tickets'],
        recipients: 'Support platform vendor',
        retention: '5 years',
        crossBorder: true,
        safeguards: 'Standard contractual clauses',
        riskLevel: 'medium',
        status: 'active',
      },
      {
        tenantId: ctx.tenantId,
        name: 'Recruitment',
        purpose: 'Assess candidates for open positions.',
        legalBasis: 'consent',
        controller: ctx.tenantName,
        dpo: 'dpo@example.com',
        dataSubjects: ['candidates'],
        dataCategories: ['cv', 'contact_details'],
        recipients: 'Recruiting agency',
        retention: '2 years',
        crossBorder: false,
        riskLevel: 'high',
        status: 'active',
      },
    ],
  });
}

async function seedCompliance(ctx: DemoCtx) {
  const template = await prisma.compliancePackage.findFirst({
    where: { slug: 'iso-27001', tenantId: null },
    include: { chapters: true, requirements: true },
  });
  if (!template) return;

  const existing = await prisma.compliancePackage.findFirst({
    where: { tenantId: ctx.tenantId, slug: 'iso-27001' },
  });
  if (existing) return;

  const adopted = await prisma.compliancePackage.create({
    data: {
      tenantId: ctx.tenantId,
      slug: 'iso-27001',
      name: 'ISO/IEC 27001:2022',
      authority: 'ISO',
      version: '2022',
      description: template.description,
      isTemplate: false,
      sourceUrl: template.sourceUrl,
    },
  });

  const chapterMap = new Map<string, string>();
  for (const chapter of template.chapters.sort((a, b) => a.position - b.position)) {
    const created = await prisma.complianceChapter.create({
      data: {
        packageId: adopted.id,
        ref: chapter.ref,
        title: chapter.title,
        description: chapter.description,
        position: chapter.position,
      },
    });
    chapterMap.set(chapter.id, created.id);
  }

  const requirements = template.requirements.sort((a, b) => a.position - b.position);
  const requirementMap = new Map<string, string>();
  for (const requirement of requirements) {
    const created = await prisma.complianceRequirement.create({
      data: {
        packageId: adopted.id,
        chapterId: requirement.chapterId ? chapterMap.get(requirement.chapterId) || null : null,
        ref: requirement.ref,
        title: requirement.title,
        description: requirement.description,
        category: requirement.category,
        position: requirement.position,
      },
    });
    requirementMap.set(requirement.id, created.id);
  }

  // Map the first 70% of requirements to existing controls and policies.
  const mappable = requirements.slice(0, Math.ceil(requirements.length * 0.7));
  for (const [index, requirement] of mappable.entries()) {
    const requirementId = requirementMap.get(requirement.id);
    if (!requirementId) continue;
    const useControl = index % 3 !== 2;
    const entity = useControl
      ? ctx.controls[index % ctx.controls.length]
      : ctx.policies[index % ctx.policies.length];
    await prisma.complianceMapping.create({
      data: {
        tenantId: ctx.tenantId,
        requirementId,
        entityType: useControl ? 'control' : 'policy',
        entityId: entity.id,
        status: index % 7 === 0 ? 'partial' : 'implemented',
        notes: useControl ? 'Covered by the control test programme.' : 'Addressed by the published policy.',
        mappedBy: ctx.users.manager.id,
      },
    });
  }
}

async function seedNotifications(ctx: DemoCtx) {
  await prisma.notification.createMany({
    data: [
      {
        tenantId: ctx.tenantId,
        userId: ctx.users.admin.id,
        type: 'risk',
        titleKey: 'notification.riskCreated',
        params: { title: ctx.risks[0].title, score: ctx.risks[0].score },
        link: `/risks/${ctx.risks[0].id}`,
        createdAt: daysAgo(2),
      },
      {
        tenantId: ctx.tenantId,
        userId: ctx.users.admin.id,
        type: 'control',
        titleKey: 'notification.controlTestFailed',
        params: { title: ctx.controls[2].name },
        link: `/controls/${ctx.controls[2].id}`,
        createdAt: daysAgo(1),
      },
      {
        tenantId: ctx.tenantId,
        userId: ctx.users.admin.id,
        type: 'policy',
        titleKey: 'notification.policyPublished',
        params: { title: ctx.policies[0].title, version: ctx.policies[0].version },
        link: `/policies/${ctx.policies[0].id}`,
        readAt: daysAgo(1),
      },
    ],
  });
}

async function seedTenantData(opts: TenantOptions) {
  const base = await ensureTenant(opts);
  if (!base) return;
  const ctx: DemoCtx = {
    tenantId: base.tenant.id,
    tenantName: base.tenant.name,
    users: base.users,
    businessUnits: [],
    assets: [],
    vendors: [],
    controls: [],
    risks: [],
    policies: [],
  };
  await seedOrganization(ctx);
  await seedControlsAndRisks(ctx);
  await seedPolicies(ctx);
  await seedProjects(ctx);
  await seedOperations(ctx);
  await seedPeople(ctx);
  await seedPrivacy(ctx);
  await seedCompliance(ctx);
  await seedNotifications(ctx);
  console.log(`✔ Demo data seeded for ${base.tenant.name}`);
}

async function main() {
  console.log('— Seeding GRC platform —');
  await seedGlobal();
  if (!env.seedDemo) {
    console.log('SEED_DEMO=false → skipping demo companies');
    return;
  }
  await seedTenantData({
    name: 'Acme Corporation',
    slug: 'acme',
    domain: 'acme.example.com',
    adminEmail: 'admin@acme.example.com',
    adminName: 'Alex Morgan',
    locale: 'en-US',
    color: '#0f766e',
    userPrefix: 'acme',
  });
  await seedTenantData({
    name: 'Globex Industries',
    slug: 'globex',
    domain: 'globex.example.com',
    adminEmail: 'admin@globex.example.com',
    adminName: 'Giulia Bianchi',
    locale: 'pt-BR',
    color: '#1d4ed8',
    userPrefix: 'globex',
  });
  const [tenants, users, risks, controls] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.risk.count(),
    prisma.control.count(),
  ]);
  console.log(`— Done: ${tenants} companies, ${users} users, ${risks} risks, ${controls} controls —`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
