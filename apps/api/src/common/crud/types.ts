export type FieldType =
  | 'text'
  | 'textarea'
  | 'int'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'stringList'
  | 'json'
  | 'user';

export interface FieldDef {
  name: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  /** Translation prefix for options, e.g. "status" → status.<option> */
  optionPrefix?: string;
  searchable?: boolean;
  sortable?: boolean;
  readOnly?: boolean;
  /** Reference module key used to populate a select (users, business-units, …) */
  ref?: string;
}

export interface CrudHooks {
  beforeCreate?: (data: any, ctx: HookContext) => Promise<any> | any;
  beforeUpdate?: (data: any, existing: any, ctx: HookContext) => Promise<any> | any;
  beforeDelete?: (existing: any, ctx: HookContext) => Promise<any> | any;
  afterCreate?: (record: any, ctx: HookContext) => Promise<void> | void;
  afterUpdate?: (record: any, previous: any, ctx: HookContext) => Promise<void> | void;
  afterDelete?: (record: any, ctx: HookContext) => Promise<void> | void;
}

export interface HookContext {
  prisma: any;
  tenantId: string | null;
  user?: { id: string; email: string; name: string } | null;
  events: { emit: (event: any) => void };
  audit: (entry: Record<string, any>) => Promise<void>;
}

export interface ModuleDef {
  /** URL segment, e.g. "business-units" */
  key: string;
  /** Prisma delegate, e.g. "businessUnit" */
  model: string;
  /** Translation key for the page title, e.g. "nav.businessUnits" */
  labelKey: string;
  /** Permission namespace, e.g. "businessUnits" */
  permission: string;
  fields: FieldDef[];
  listFields: string[];
  searchFields: string[];
  defaultSort?: { field: string; dir: 'asc' | 'desc' };
  codePrefix?: string;
  codeField?: string;
  include?: Record<string, any>;
  hooks?: CrudHooks;
  computed?: (record: any) => Record<string, any>;
}
