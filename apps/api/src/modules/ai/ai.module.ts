import { Module } from '@nestjs/common';
import { AIController, AIService } from './ai.service';
import { MCPController, MCPService } from './mcp.controller';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [DashboardModule],
  controllers: [AIController, MCPController],
  providers: [AIService, MCPService],
})
export class AIModule {}
