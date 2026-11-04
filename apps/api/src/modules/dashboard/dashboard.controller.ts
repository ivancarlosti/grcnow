import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthUser, CurrentUser } from '../../common/auth/auth.decorators';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  summary(@CurrentUser() user: AuthUser) {
    return this.dashboard.summary(user?.id);
  }

  @Get('compliance')
  async compliance() {
    return { items: await this.dashboard.complianceScores() };
  }
}
