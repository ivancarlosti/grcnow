import { ModuleDef } from '../../../common/crud/types';
import { orgModules } from './org.defs';
import { grcModules } from './grc.defs';
import { extendedModules } from './extended.defs';
import { platformModules } from './platform.defs';

export const ALL_MODULES: ModuleDef[] = [...orgModules, ...grcModules, ...extendedModules, ...platformModules];

export const MODULE_MAP: Map<string, ModuleDef> = new Map(ALL_MODULES.map((def) => [def.key, def]));

export function getModule(key: string): ModuleDef | undefined {
  return MODULE_MAP.get(key);
}
