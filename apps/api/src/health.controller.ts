import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';
import { Public } from './common/auth/auth.decorators';
import { env } from './config';

@Controller('api/health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async health() {
    let database = false;
    try {
      await this.prisma.base.$queryRaw`SELECT 1`;
      database = true;
    } catch {
      database = false;
    }
    return {
      status: database ? 'ok' : 'degraded',
      database,
      authMethod: env.authMethod,
      storage: env.storageDriver,
      version: process.env.APP_VERSION || '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
