import {
  Activity,
  AlertOctagon,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileSpreadsheet,
  FileText,
  Flag,
  GitBranch,
  Globe2,
  GraduationCap,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Lock,
  Megaphone,
  Network,
  Plug,
  ScrollText,
  Settings,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Target,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  permission?: string;
  superAdmin?: boolean;
  exact?: boolean;
}

export interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.dashboard',
    items: [{ href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, exact: true }],
  },
  {
    labelKey: 'nav.organization',
    items: [
      { href: '/business-units', labelKey: 'nav.businessUnits', icon: Building2, permission: 'businessUnits:read' },
      { href: '/assets', labelKey: 'nav.assets', icon: Boxes, permission: 'assets:read' },
      { href: '/vendors', labelKey: 'nav.vendors', icon: Briefcase, permission: 'vendors:read' },
    ],
  },
  {
    labelKey: 'nav.controls',
    items: [
      { href: '/controls', labelKey: 'nav.controls', icon: Shield, permission: 'controls:read' },
      { href: '/control-tests', labelKey: 'nav.controlTests', icon: ClipboardCheck, permission: 'controls:read' },
      { href: '/risks', labelKey: 'nav.risks', icon: ShieldAlert, permission: 'risks:read' },
      { href: '/risk-matrix', labelKey: 'nav.riskMatrix', icon: Target, permission: 'risks:read' },
    ],
  },
  {
    labelKey: 'nav.compliance',
    items: [
      { href: '/compliance', labelKey: 'nav.compliance', icon: ListChecks, permission: 'compliance:read' },
      { href: '/policies', labelKey: 'nav.policies', icon: FileText, permission: 'policies:read' },
      { href: '/exceptions', labelKey: 'nav.exceptions', icon: AlertOctagon, permission: 'exceptions:read' },
    ],
  },
  {
    labelKey: 'nav.projects',
    items: [
      { href: '/projects', labelKey: 'nav.projects', icon: ClipboardList, permission: 'projects:read' },
      { href: '/incidents', labelKey: 'nav.incidents', icon: Activity, permission: 'incidents:read' },
      { href: '/findings', labelKey: 'nav.findings', icon: Flag, permission: 'findings:read' },
      { href: '/bcp', labelKey: 'nav.bcp', icon: GitBranch, permission: 'bcp:read' },
      { href: '/assessments', labelKey: 'nav.assessments', icon: CalendarClock, permission: 'assessments:read' },
    ],
  },
  {
    labelKey: 'nav.training',
    items: [
      { href: '/training', labelKey: 'nav.training', icon: GraduationCap, permission: 'training:read' },
      { href: '/account-reviews', labelKey: 'nav.accountReviews', icon: KeyRound, permission: 'accountReviews:read' },
      { href: '/whistleblowing', labelKey: 'nav.whistleblowing', icon: Megaphone, permission: 'whistleblowing:read' },
    ],
  },
  {
    labelKey: 'nav.dataPrivacy',
    items: [
      { href: '/data-flows', labelKey: 'nav.dataFlows', icon: Network, permission: 'privacy:read' },
      { href: '/ropa', labelKey: 'nav.ropa', icon: Database, permission: 'privacy:read' },
    ],
  },
  {
    labelKey: 'nav.administration',
    items: [
      { href: '/insights', labelKey: 'nav.aiAssistant', icon: Sparkles },
      { href: '/audit-logs', labelKey: 'nav.auditLog', icon: ScrollText, permission: 'audit:read' },
      { href: '/settings/users', labelKey: 'nav.users', icon: Users, permission: 'users:read' },
      { href: '/settings/roles', labelKey: 'nav.roles', icon: Lock, permission: 'roles:read' },
      { href: '/settings', labelKey: 'nav.settings', icon: Settings, permission: 'settings:read' },
      { href: '/custom-fields', labelKey: 'settings.customFields', icon: SlidersHorizontal, permission: 'customization:read' },
      { href: '/status-rules', labelKey: 'settings.statusRules', icon: Tags, permission: 'customization:read' },
      { href: '/webhooks', labelKey: 'nav.webhooks', icon: Plug, permission: 'integrations:read' },
      { href: '/automation', labelKey: 'nav.automation', icon: Workflow, permission: 'automation:read' },
      { href: '/api-tokens', labelKey: 'nav.apiTokens', icon: FileSpreadsheet, permission: 'settings:read' },
    ],
  },
  {
    labelKey: 'nav.platform',
    items: [
      { href: '/admin/companies', labelKey: 'nav.companies', icon: Globe2, superAdmin: true },
      { href: '/admin/settings', labelKey: 'nav.globalSettings', icon: Settings, superAdmin: true },
      { href: '/admin/translations', labelKey: 'nav.translations', icon: BookOpen, superAdmin: true },
    ],
  },
];

export function canSee(item: NavItem, permissions: string[], isSuperAdmin: boolean) {
  if (item.superAdmin) return isSuperAdmin;
  if (isSuperAdmin) return true;
  if (!item.permission) return true;
  const [module, action] = item.permission.split(':');
  return permissions.some(
    (p) => p === '*' || p === item.permission || p === `${module}:*` || p === `*:${action}`,
  );
}

export const ICON_INBOX = Inbox;
export const ICON_COMPLIANCE = ClipboardCheck;
