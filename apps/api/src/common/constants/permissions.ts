/** Every permission namespace used by the platform (module:action). */
export const PERMISSION_MODULES: { key: string; labelKey: string; group: string }[] = [
  { key: 'businessUnits', labelKey: 'nav.businessUnits', group: 'organization' },
  { key: 'assets', labelKey: 'nav.assets', group: 'organization' },
  { key: 'vendors', labelKey: 'nav.vendors', group: 'organization' },
  { key: 'controls', labelKey: 'nav.controls', group: 'controls' },
  { key: 'risks', labelKey: 'nav.risks', group: 'risks' },
  { key: 'compliance', labelKey: 'nav.compliance', group: 'compliance' },
  { key: 'policies', labelKey: 'nav.policies', group: 'policies' },
  { key: 'exceptions', labelKey: 'nav.exceptions', group: 'policies' },
  { key: 'projects', labelKey: 'nav.projects', group: 'projects' },
  { key: 'incidents', labelKey: 'nav.incidents', group: 'operations' },
  { key: 'findings', labelKey: 'nav.findings', group: 'operations' },
  { key: 'bcp', labelKey: 'nav.bcp', group: 'operations' },
  { key: 'assessments', labelKey: 'nav.assessments', group: 'people' },
  { key: 'training', labelKey: 'nav.training', group: 'people' },
  { key: 'accountReviews', labelKey: 'nav.accountReviews', group: 'people' },
  { key: 'whistleblowing', labelKey: 'nav.whistleblowing', group: 'people' },
  { key: 'privacy', labelKey: 'nav.dataPrivacy', group: 'privacy' },
  { key: 'files', labelKey: 'common.attachments', group: 'platform' },
  { key: 'comments', labelKey: 'common.comments', group: 'platform' },
  { key: 'users', labelKey: 'nav.users', group: 'administration' },
  { key: 'roles', labelKey: 'nav.roles', group: 'administration' },
  { key: 'settings', labelKey: 'nav.settings', group: 'administration' },
  { key: 'customization', labelKey: 'nav.customization', group: 'administration' },
  { key: 'integrations', labelKey: 'nav.webhooks', group: 'administration' },
  { key: 'automation', labelKey: 'nav.automation', group: 'administration' },
  { key: 'audit', labelKey: 'nav.auditLog', group: 'administration' },
];

const READ_ALL = PERMISSION_MODULES.map((m) => `${m.key}:read`);
const WRITE_GRC = PERMISSION_MODULES.filter((m) => !['users', 'roles', 'settings'].includes(m.key)).map(
  (m) => `${m.key}:*`,
);

export interface DefaultRole {
  key: string;
  name: string;
  description: string;
  permissions: string[];
}

/** Roles copied into every new company. */
export const DEFAULT_ROLES: DefaultRole[] = [
  {
    key: 'company_admin',
    name: 'Company Admin',
    description: 'Full control of the company workspace, users and settings.',
    permissions: ['*'],
  },
  {
    key: 'grc_manager',
    name: 'GRC Manager',
    description: 'Manages the GRC programme across all modules.',
    permissions: [...WRITE_GRC, 'users:read', 'roles:read', 'settings:read', 'audit:read'],
  },
  {
    key: 'auditor',
    name: 'Auditor',
    description: 'Read-only access to every record plus audit trail.',
    permissions: [...READ_ALL],
  },
  {
    key: 'risk_owner',
    name: 'Risk Owner',
    description: 'Owns risks and their treatment plans.',
    permissions: ['risks:*', 'controls:read', 'assets:read', 'policies:read', 'findings:read', 'projects:read', 'files:*', 'comments:*'],
  },
  {
    key: 'policy_owner',
    name: 'Policy Owner',
    description: 'Owns policy authoring, approvals and acknowledgements.',
    permissions: [
      'policies:*',
      'exceptions:read',
      'compliance:read',
      'risks:read',
      'controls:read',
      'training:read',
      'files:*',
      'comments:*',
    ],
  },
  {
    key: 'regular_user',
    name: 'Regular User',
    description: 'Access to policies, training and own assessments.',
    permissions: ['policies:read', 'training:read', 'assessments:read', 'files:*', 'comments:*'],
  },
];

export const ROLE_KEYS = DEFAULT_ROLES.map((r) => r.key);
