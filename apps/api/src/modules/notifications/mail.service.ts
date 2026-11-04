import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../common/prisma/prisma.service';
import { env } from '../../config';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {
    if (env.smtp.host) {
      this.transporter = nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.secure,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      });
    }
  }

  async sendRaw(to: string, subject: string, body: string) {
    if (!this.transporter) {
      this.logger.log(`[mail disabled] to=${to} subject="${subject}"`);
      return { sent: false };
    }
    await this.transporter.sendMail({ from: env.smtp.from, to, subject, text: body, html: body.replace(/\n/g, '<br/>') });
    return { sent: true };
  }

  /** Renders a template (tenant override → global → key fallback) and sends it. */
  async sendTemplate(params: {
    to: string;
    event: string;
    locale?: string;
    values: Record<string, any>;
    tenantId?: string | null;
  }) {
    const locale = params.locale || 'en-US';
    const template =
      (params.tenantId
        ? await this.prisma.base.notificationTemplate.findFirst({
            where: { tenantId: params.tenantId, event: params.event, locale },
          })
        : null) ||
      (await this.prisma.base.notificationTemplate.findFirst({
        where: { tenantId: null, event: params.event, locale },
      })) ||
      (await this.prisma.base.notificationTemplate.findFirst({ where: { tenantId: null, event: params.event } }));

    const subject = template
      ? I18nService.interpolate(template.subject, params.values)
      : I18nService.interpolate(await this.i18n.translate(locale, params.event), params.values);
    const body = template
      ? I18nService.interpolate(template.body, params.values)
      : I18nService.interpolate(await this.i18n.translate(locale, `${params.event}.body`), params.values);
    return this.sendRaw(params.to, subject, body);
  }
}
