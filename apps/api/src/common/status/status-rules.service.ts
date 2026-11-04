import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { tenantContext } from '../tenant/tenant-context';

export interface StatusRuleRow {
  id: string;
  module: string;
  name: string;
  condition: any;
  statusKey: string;
  label: string;
  color: string;
  icon?: string | null;
  priority: number;
}

interface Condition {
  field: string;
  op: string;
  value?: any;
}

const num = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));
const str = (v: any) => (v === null || v === undefined ? '' : String(v).toLowerCase());

function compare(record: any, cond: Condition): boolean {
  const raw = cond.field.includes('.')
    ? cond.field.split('.').reduce((acc: any, part) => (acc == null ? acc : acc[part]), record)
    : record?.[cond.field];
  const op = String(cond.op || 'eq').toLowerCase();
  switch (op) {
    case 'eq':
      return String(raw ?? '') === String(cond.value ?? '');
    case 'neq':
      return String(raw ?? '') !== String(cond.value ?? '');
    case 'gt':
      return num(raw) !== null && num(raw)! > num(cond.value)!;
    case 'gte':
      return num(raw) !== null && num(raw)! >= num(cond.value)!;
    case 'lt':
      return num(raw) !== null && num(raw)! < num(cond.value)!;
    case 'lte':
      return num(raw) !== null && num(raw)! <= num(cond.value)!;
    case 'contains':
      return str(raw).includes(str(cond.value));
    case 'startsWith':
      return str(raw).startsWith(str(cond.value));
    case 'in':
      return Array.isArray(cond.value) && cond.value.map(str).includes(str(raw));
    case 'empty':
    case 'isNull':
      return raw === null || raw === undefined || raw === '';
    case 'notEmpty':
    case 'isNotNull':
      return !(raw === null || raw === undefined || raw === '');
    case 'before':
      return raw ? new Date(raw).getTime() < new Date(cond.value).getTime() : false;
    case 'after':
      return raw ? new Date(raw).getTime() > new Date(cond.value).getTime() : false;
    case 'overdue':
      return raw ? new Date(raw).getTime() < Date.now() : false;
    default:
      return false;
  }
}

export function evaluateCondition(condition: any, record: any): boolean {
  if (!condition) return false;
  if (Array.isArray(condition)) return condition.every((c) => compare(record, c));
  if (Array.isArray(condition.all)) return condition.all.every((c: Condition) => compare(record, c));
  if (Array.isArray(condition.any)) return condition.any.some((c: Condition) => compare(record, c));
  if (condition.field) return compare(record, condition as Condition);
  return false;
}

/** Computes dynamic status badges from the tenant's status rules. */
@Injectable()
export class StatusRulesService {
  private cache = new Map<string, { rules: StatusRuleRow[]; at: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async rulesFor(module: string): Promise<StatusRuleRow[]> {
    const tenantId = tenantContext.tenantId;
    if (!tenantId) return [];
    const key = `${tenantId}:${module}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < 5000) return cached.rules;
    const rules = (await this.prisma.base.statusRule.findMany({
      where: { tenantId, module, active: true },
      orderBy: { priority: 'asc' },
    })) as unknown as StatusRuleRow[];
    this.cache.set(key, { rules, at: Date.now() });
    return rules;
  }

  evaluate(condition: any, record: any): boolean {
    return evaluateCondition(condition, record);
  }

  async decorate<T extends Record<string, any>>(module: string, records: T[]): Promise<(T & { badge?: any })[]> {
    const rules = await this.rulesFor(module);
    if (!rules.length) return records;
    return records.map((record) => {
      const rule = rules.find((r) => evaluateCondition(r.condition, record));
      return rule
        ? { ...record, badge: { key: rule.statusKey, label: rule.label, color: rule.color, icon: rule.icon } }
        : record;
    });
  }
}
