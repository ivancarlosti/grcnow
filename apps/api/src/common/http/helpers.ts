import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ZodType } from 'zod';

export const notFound = (messageKey = 'errors.notFound') => new NotFoundException({ messageKey });
export const forbidden = (messageKey = 'errors.forbidden') => new ForbiddenException({ messageKey });
export const badRequest = (messageKey = 'errors.badRequest', extra: Record<string, unknown> = {}) =>
  new BadRequestException({ messageKey, ...extra });
export const conflict = (messageKey = 'errors.conflict') => new ConflictException({ messageKey });

/** Validates a payload with zod and throws a localized 400 on failure. */
export function parseInput<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw new BadRequestException({
      messageKey: 'errors.validation',
      issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}

export function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  return false;
}

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
