import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { randomToken } from '../../common/auth/password';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Public } from '../../common/auth/auth.decorators';
import { SettingsService } from '../settings/settings.service';
import { badRequest, notFound } from '../../common/http/helpers';
import { isRtl, LOCALES, normalizeLocale } from '../../config';

@Controller('api/public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  @Public()
  @Get('config')
  async config() {
    const recaptcha = await this.settings.recaptcha();
    return {
      appName: await this.settings.get(null, 'app_name', 'GRC Platform'),
      defaultLocale: await this.settings.defaultLocale(),
      authMethod: (process.env.AUTH_METHOD || 'account').toLowerCase(),
      recaptchaSiteKey: recaptcha.enabled ? recaptcha.siteKey : null,
      locales: LOCALES.map((code) => ({ code, dir: isRtl(code) ? 'rtl' : 'ltr' })),
    };
  }

  @Public()
  @Get('tenants/:slug')
  async tenant(@Param('slug') slug: string) {
    const tenant = await this.prisma.base.tenant.findFirst({
      where: { slug, deletedAt: null, status: 'active' },
      select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, defaultLocale: true },
    });
    if (!tenant) throw notFound('errors.tenantNotFound');
    return tenant;
  }

  @Public()
  @Post('whistleblowing/:slug')
  async report(
    @Param('slug') slug: string,
    @Body()
    body: {
      category?: string;
      subject?: string;
      message?: string;
      contactEmail?: string;
      recaptchaToken?: string;
    },
    @Req() req: any,
  ) {
    const tenant = await this.prisma.base.tenant.findFirst({ where: { slug, deletedAt: null, status: 'active' } });
    if (!tenant) throw notFound('errors.tenantNotFound');
    try {
      await this.settings.verifyRecaptcha(body.recaptchaToken, req.ip, 'whistleblowing');
    } catch {
      throw badRequest('auth.captchaFailed');
    }
    if (!body?.subject || !body?.message) {
      throw new BadRequestException({ messageKey: 'errors.validation' });
    }
    const created = await this.prisma.base.whistleblowingReport.create({
      data: {
        tenantId: tenant.id,
        token: randomToken(16),
        category: body.category || 'other',
        subject: String(body.subject).slice(0, 200),
        message: String(body.message).slice(0, 5000),
        contactEmail: body.contactEmail || null,
        ip: req.ip || null,
        status: 'new',
      },
    });
    return { ok: true, token: created.token };
  }

  @Public()
  @Get('assessments/:token')
  async assessment(@Param('token') token: string) {
    const assessment = await this.prisma.base.assessment.findFirst({
      where: { publicToken: token },
      include: { template: true },
    });
    if (!assessment) throw notFound();
    await this.prisma.base.assessment.updateMany({
      where: { id: assessment.id, status: 'draft' },
      data: { status: 'sent', sentAt: new Date() },
    });
    const tenant = await this.prisma.base.tenant.findUnique({ where: { id: assessment.tenantId } });
    return {
      id: assessment.id,
      name: assessment.name,
      status: assessment.status,
      dueDate: assessment.dueDate,
      tenant: tenant ? { name: tenant.name, logoUrl: tenant.logoUrl, primaryColor: tenant.primaryColor } : null,
      questions: assessment.template?.questions || [],
      answered: Boolean(assessment.answers),
      locale: tenant?.defaultLocale || null,
    };
  }

  @Public()
  @Post('assessments/:token')
  async submitAssessment(@Param('token') token: string, @Body() body: { answers?: Record<string, any> }) {
    const assessment = await this.prisma.base.assessment.findFirst({
      where: { publicToken: token },
      include: { template: true },
    });
    if (!assessment) throw notFound();
    const questions: any[] = (assessment.template?.questions as any[]) || [];
    const answers = body?.answers || {};
    const totalWeight = questions.reduce((acc, q) => acc + (Number(q.weight) || 1), 0) || 1;
    const earned = questions.reduce((acc, q) => {
      const value = answers[q.id ?? q.key];
      const weight = Number(q.weight) || 1;
      if (q.type === 'boolean') return acc + (value === true || value === 'true' ? weight : 0);
      return acc + (value ? weight : 0);
    }, 0);
    const score = Math.round((earned / totalWeight) * 100);
    await this.prisma.base.assessment.update({
      where: { id: assessment.id },
      data: { answers: answers as any, score, status: 'completed', completedAt: new Date() },
    });
    return { ok: true, score };
  }

  @Public()
  @Get('locales')
  locales() {
    return {
      items: LOCALES.map((code) => ({ code, dir: isRtl(code) ? 'rtl' : 'ltr', name: normalizeLocale(code) })),
    };
  }
}
