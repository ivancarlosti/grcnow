import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { CoreModule } from './common/core.module';
import { AuthGuard } from './common/auth/auth.guard';
import { TenantGuard } from './common/auth/tenant.guard';
import { PermissionsGuard } from './common/auth/permissions.guard';
import { RequestContextInterceptor } from './common/auth/request-context.interceptor';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { AllExceptionsFilter } from './common/http/all-exceptions.filter';
import { SettingsModule } from './modules/settings/settings.module';
import { I18nModule } from './modules/i18n/i18n.module';
import { StorageModule } from './modules/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files/files.module';
import { RecordsModule } from './modules/records/records.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { PublicModule } from './modules/public/public.module';
import { AIModule } from './modules/ai/ai.module';
import { HealthController } from './health.controller';
import { env } from './config';

@Module({
  imports: [
    JwtModule.register({ global: true, secret: env.jwtSecret }),
    CoreModule,
    SettingsModule,
    I18nModule,
    StorageModule,
    AuthModule,
    FilesModule,
    RecordsModule,
    TenantsModule,
    UsersModule,
    RolesModule,
    DashboardModule,
    ComplianceModule,
    NotificationsModule,
    WorkspaceModule,
    PublicModule,
    AIModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
