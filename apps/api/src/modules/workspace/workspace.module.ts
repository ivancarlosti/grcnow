import { Module } from '@nestjs/common';
import { SearchController, CommentsController, SavedViewsController } from './workspace.controllers';
import { SettingsController } from './settings.controller';
import { AuditController, ApiTokensController } from './audit-tokens.controller';
import { SearchService } from './search.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TenantsModule],
  controllers: [
    SearchController,
    CommentsController,
    SavedViewsController,
    SettingsController,
    AuditController,
    ApiTokensController,
  ],
  providers: [SearchService],
})
export class WorkspaceModule {}
