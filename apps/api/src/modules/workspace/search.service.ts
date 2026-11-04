import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ALL_MODULES } from '../records/defs';

const TITLE_FIELDS = ['title', 'name', 'subject', 'code'];
const SUBTITLE_FIELDS = ['description', 'summary', 'code', 'email'];

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(term: string) {
    const q = String(term || '').trim();
    if (q.length < 2) return { items: [], total: 0 };
    const db = this.prisma.db as any;
    const targets = ALL_MODULES.filter(
      (def) => def.searchFields.length && !['whistleblowing', 'account-review-items'].includes(def.key),
    ).slice(0, 24);

    const results = await Promise.all(
      targets.map(async (def) => {
        try {
          const rows = await db[def.model].findMany({
            where: {
              OR: def.searchFields.map((field) => ({ [field]: { contains: q, mode: 'insensitive' } })),
            },
            take: 4,
            orderBy: { updatedAt: 'desc' },
          });
          return rows.map((row: any) => {
            const titleKey = TITLE_FIELDS.find((f) => row[f]);
            const subtitleKey = SUBTITLE_FIELDS.find((f) => row[f] && f !== titleKey);
            return {
              id: row.id,
              module: def.key,
              labelKey: def.labelKey,
              title: titleKey ? String(row[titleKey]) : `${def.key} record`,
              subtitle: subtitleKey ? String(row[subtitleKey]).slice(0, 140) : '',
              status: row.status || null,
              updatedAt: row.updatedAt,
            };
          });
        } catch {
          return [];
        }
      }),
    );
    const items = results.flat().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return { items, total: items.length, term: q };
  }
}
