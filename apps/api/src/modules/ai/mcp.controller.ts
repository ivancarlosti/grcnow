import { Body, Controller, Get, Injectable, Post } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class MCPService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
  ) {}

  tools() {
    return [
      {
        name: 'list_top_risks',
        description: 'List the highest-scoring risks of the current company.',
        inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
      },
      {
        name: 'compliance_status',
        description: 'Compliance coverage per framework adopted by the company.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'overdue_controls',
        description: 'Controls whose next test date is in the past.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'search_records',
        description: 'Search risks, controls and policies.',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      },
    ];
  }

  async call(name: string, args: any) {
    if (name === 'list_top_risks') {
      const risks = await this.prisma.db.risk.findMany({
        orderBy: { score: 'desc' },
        take: Number(args?.limit) || 10,
        select: { code: true, title: true, score: true, residualScore: true, status: true, treatment: true },
      });
      return { risks };
    }
    if (name === 'compliance_status') {
      return { frameworks: await this.dashboard.complianceScores() };
    }
    if (name === 'overdue_controls') {
      const controls = await this.prisma.db.control.findMany({
        where: { nextTestAt: { lt: new Date() } },
        take: 25,
        select: { code: true, name: true, nextTestAt: true, status: true, ownerId: true },
      });
      return { controls };
    }
    if (name === 'search_records') {
      const q = String(args?.query || '');
      const contains = (field: string) => ({ [field]: { contains: q, mode: 'insensitive' } });
      const [risks, controls, policies] = await Promise.all([
        this.prisma.db.risk.findMany({
          where: { OR: [contains('title'), contains('code')] },
          take: 5,
          select: { id: true, code: true, title: true },
        }),
        this.prisma.db.control.findMany({
          where: { OR: [contains('name'), contains('code')] },
          take: 5,
          select: { id: true, code: true, name: true },
        }),
        this.prisma.db.policy.findMany({
          where: { OR: [contains('title'), contains('code')] },
          take: 5,
          select: { id: true, code: true, title: true },
        }),
      ]);
      return { risks, controls, policies };
    }
    throw new Error(`Unknown tool: ${name}`);
  }
}

@Controller('api/mcp')
export class MCPController {
  constructor(private readonly mcp: MCPService) {}

  @Get()
  info() {
    return {
      name: 'grc-mcp',
      version: '1.0.0',
      protocolVersion: '2025-06-18',
      transport: 'streamable-http',
      endpoint: '/api/mcp',
      tools: this.mcp.tools(),
    };
  }

  @Post()
  async rpc(@Body() body: any) {
    const id = body?.id ?? null;
    const method = body?.method;
    const respond = (result: any) => ({ jsonrpc: '2.0', id, result });
    const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });
    try {
      if (method === 'initialize') {
        return respond({
          protocolVersion: body?.params?.protocolVersion || '2025-06-18',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'grc-mcp', version: '1.0.0' },
        });
      }
      if (method === 'tools/list') return respond({ tools: this.mcp.tools() });
      if (method === 'tools/call') {
        const result = await this.mcp.call(body?.params?.name, body?.params?.arguments || {});
        return respond({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false });
      }
      if (method === 'ping') return respond({});
      return fail(-32601, `Method not found: ${method}`);
    } catch (err) {
      return fail(-32603, (err as Error).message);
    }
  }
}
