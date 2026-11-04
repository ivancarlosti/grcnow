import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsService } from '../events/events.service';
import { StatusRulesService } from '../status/status-rules.service';
import { tenantContext } from '../tenant/tenant-context';
import { ModuleDef } from './types';
import { badRequest, notFound, toDate } from '../http/helpers';
import { mapCsvRow, parseCsv, toCsv } from '../csv/csv.util';

export interface ListQuery {
  q?: string;
  page?: string | number;
  pageSize?: string | number;
  sort?: string;
  dir?: string;
  [key: string]: any;
}

@Injectable()
export class CrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventsService,
    private readonly statusRules: StatusRulesService,
  ) {}

  delegate(def: ModuleDef): any {
    return (this.prisma.db as any)[def.model];
  }

  private user() {
    const ctx = tenantContext.get();
    return ctx?.userId ? { id: ctx.userId, email: ctx.userEmail || '', name: '' } : null;
  }

  private hookContext(): any {
    return {
      prisma: this.prisma.db,
      tenantId: tenantContext.tenantId,
      user: this.user(),
      events: this.events,
      audit: (entry: any) => this.audit.log(entry as any),
    };
  }

  coerce(def: ModuleDef, dto: any, partial = false): any {
    const data: any = {};
    for (const field of def.fields) {
      if (!(field.name in (dto || {}))) continue;
      const raw = dto[field.name];
      switch (field.type) {
        case 'int':
          data[field.name] = raw === null || raw === '' ? null : Math.trunc(Number(raw));
          break;
        case 'number':
          data[field.name] = raw === null || raw === '' ? null : Number(raw);
          break;
        case 'boolean':
          data[field.name] = raw === true || raw === 'true' || raw === 1 || raw === '1';
          break;
        case 'date':
        case 'datetime':
          data[field.name] = raw ? toDate(raw) : null;
          break;
        case 'stringList':
        case 'multiselect':
          data[field.name] = Array.isArray(raw)
            ? raw.map(String)
            : String(raw || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
          break;
        case 'json':
          if (raw === null || raw === '') data[field.name] = null;
          else if (typeof raw === 'string') {
            try {
              data[field.name] = JSON.parse(raw);
            } catch {
              throw badRequest('errors.validation', { issues: [{ path: field.name, message: 'invalid json' }] });
            }
          } else data[field.name] = raw;
          break;
        default:
          data[field.name] = raw === '' ? null : raw;
      }
    }
    if ('custom' in (dto || {})) data.custom = dto.custom;
    if (!partial) {
      for (const field of def.fields) {
        if (!field.required) continue;
        const value = data[field.name];
        if (value === undefined || value === null || value === '') {
          throw badRequest('errors.validation', { issues: [{ path: field.name, message: 'required' }] });
        }
      }
    }
    return data;
  }

  private filterValue(field: any, value: any) {
    if (value === undefined || value === null || value === '') return undefined;
    if (field.type === 'int' || field.type === 'number') {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    }
    if (field.type === 'boolean') return value === true || value === 'true' || value === '1';
    return String(value);
  }

  private async whereFor(def: ModuleDef, query: ListQuery) {
    const where: any = {};
    for (const field of def.fields) {
      const value = query[field.name];
      if (value === undefined || value === '') continue;
      if (field.type === 'stringList' || field.type === 'multiselect') {
        where[field.name] = { has: String(value) };
      } else {
        const filter = this.filterValue(field, value);
        if (filter !== undefined) where[field.name] = filter;
      }
    }
    if (query.q && def.searchFields.length) {
      where.OR = def.searchFields.map((field) => ({ [field]: { contains: String(query.q), mode: 'insensitive' } }));
    }
    const from = query.from || query.createdFrom;
    const to = query.to || query.createdTo;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }
    return where;
  }

  private sortFor(def: ModuleDef, query: ListQuery) {
    const allowed = new Set([...def.fields.map((f) => f.name), 'createdAt', 'updatedAt', 'id']);
    const field = query.sort && allowed.has(String(query.sort)) ? String(query.sort) : def.defaultSort?.field;
    const dir = String(query.dir || def.defaultSort?.dir || 'desc') === 'asc' ? 'asc' : 'desc';
    return field ? { [field]: dir } : { createdAt: 'desc' };
  }

  async list(def: ModuleDef, query: ListQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(query.pageSize) || 25));
    const where = await this.whereFor(def, query);
    const orderBy = this.sortFor(def, query);
    const delegate = this.delegate(def);
    const [total, rows] = await Promise.all([
      delegate.count({ where }),
      delegate.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        ...(def.include ? { include: def.include } : {}),
      }),
    ]);
    let items = rows.map((row: any) => (def.computed ? { ...row, ...def.computed(row) } : row));
    items = await this.statusRules.decorate(def.key, items);
    return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) || 1 };
  }

  async get(def: ModuleDef, id: string) {
    const record = await this.delegate(def).findFirst({
      where: { id },
      ...(def.include ? { include: def.include } : {}),
    });
    if (!record) throw notFound();
    const enriched = def.computed ? { ...record, ...def.computed(record) } : record;
    const [decorated] = await this.statusRules.decorate(def.key, [enriched]);
    return decorated;
  }

  async create(def: ModuleDef, dto: any) {
    let data = this.coerce(def, dto, false);
    const ctx = this.hookContext();
    if (def.codePrefix && !data[def.codeField || 'code']) {
      data[def.codeField || 'code'] = await this.nextCode(def);
    }
    if (def.hooks?.beforeCreate) data = await def.hooks.beforeCreate(data, ctx);
    const record = await this.delegate(def).create({ data });
    this.events.emit({
      type: `${def.key}.created`,
      module: def.key,
      tenantId: tenantContext.tenantId,
      actorId: this.user()?.id,
      entityId: record.id,
      record,
    });
    await this.audit.log({ action: 'create', module: def.key, entity: def.key, entityId: record.id, after: record });
    if (def.hooks?.afterCreate) await def.hooks.afterCreate(record, ctx);
    return this.get(def, record.id);
  }

  async update(def: ModuleDef, id: string, dto: any) {
    const existing = await this.delegate(def).findFirst({ where: { id } });
    if (!existing) throw notFound();
    let data = this.coerce(def, dto, true);
    const ctx = this.hookContext();
    if (def.hooks?.beforeUpdate) data = await def.hooks.beforeUpdate(data, existing, ctx);
    const record = await this.delegate(def).update({ where: { id }, data });
    this.events.emit({
      type: `${def.key}.updated`,
      module: def.key,
      tenantId: tenantContext.tenantId,
      actorId: this.user()?.id,
      entityId: record.id,
      record,
      previous: existing,
    });
    await this.audit.log({
      action: 'update',
      module: def.key,
      entity: def.key,
      entityId: record.id,
      before: existing,
      after: record,
    });
    if (def.hooks?.afterUpdate) await def.hooks.afterUpdate(record, existing, ctx);
    return this.get(def, record.id);
  }

  async remove(def: ModuleDef, id: string) {
    const existing = await this.delegate(def).findFirst({ where: { id } });
    if (!existing) throw notFound();
    const ctx = this.hookContext();
    if (def.hooks?.beforeDelete) await def.hooks.beforeDelete(existing, ctx);
    await this.delegate(def).delete({ where: { id } });
    this.events.emit({
      type: `${def.key}.deleted`,
      module: def.key,
      tenantId: tenantContext.tenantId,
      actorId: this.user()?.id,
      entityId: id,
      previous: existing,
    });
    await this.audit.log({ action: 'delete', module: def.key, entity: def.key, entityId: id, before: existing });
    if (def.hooks?.afterDelete) await def.hooks.afterDelete(existing, ctx);
    return { ok: true, id };
  }

  private async nextCode(def: ModuleDef): Promise<string> {
    const total = await this.delegate(def).count();
    return `${def.codePrefix}-${String(total + 1).padStart(4, '0')}`;
  }

  async exportCsv(def: ModuleDef, query: ListQuery = {}) {
    const { items } = await this.list(def, { ...query, page: 1, pageSize: 500 });
    const columns = def.fields.map((f) => ({ key: f.name, label: f.name }));
    return toCsv(items as any[], columns);
  }

  async importCsv(def: ModuleDef, content: string) {
    const rows = parseCsv(content);
    const columns = def.fields.map((f) => ({ key: f.name, label: f.name }));
    const created: string[] = [];
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      const mapped = mapCsvRow(rows[i], columns);
      try {
        const record = await this.create(def, mapped);
        created.push(record.id);
      } catch (err: any) {
        errors.push({ row: i + 2, message: err?.response?.messageKey || err?.message || 'error' });
      }
    }
    return { total: rows.length, created: created.length, failed: errors.length, errors: errors.slice(0, 50) };
  }

  async options(def: ModuleDef) {
    const rows = await this.delegate(def).findMany({ take: 500, orderBy: { createdAt: 'asc' } });
    return {
      items: rows.map((row: any) => ({
        value: row.id,
        label: row.name || row.title || row.code || row.key || row.email || row.id,
      })),
    };
  }

  async meta(def: ModuleDef) {
    const tenantId = tenantContext.tenantId;
    const [customFields, customTabs] = tenantId
      ? await Promise.all([
          this.prisma.base.customField.findMany({
            where: { tenantId, module: def.key, active: true },
            orderBy: { position: 'asc' },
          }),
          this.prisma.base.customTab.findMany({ where: { tenantId, module: def.key }, orderBy: { position: 'asc' } }),
        ])
      : [[], []];
    return {
      key: def.key,
      model: def.model,
      labelKey: def.labelKey,
      fields: def.fields,
      listFields: def.listFields,
      searchFields: def.searchFields,
      defaultSort: def.defaultSort,
      codePrefix: def.codePrefix || null,
      customFields,
      customTabs,
    };
  }

  async userOptions() {
    const users = await this.prisma.db.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      take: 500,
    });
    return { items: users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })) };
  }
}
