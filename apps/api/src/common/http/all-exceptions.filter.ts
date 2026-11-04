import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Normalizes every error into { statusCode, messageKey, message, issues }.
 * The frontend translates messageKey, so the API never returns UI copy.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload: any = exception instanceof HttpException ? exception.getResponse() : null;

    let messageKey = 'errors.serverError';
    let message = 'Internal server error';
    let issues: any;

    if (typeof payload === 'string') {
      message = payload;
      messageKey = status === 404 ? 'errors.notFound' : 'errors.generic';
    } else if (payload && typeof payload === 'object') {
      messageKey = payload.messageKey || (status === 404 ? 'errors.notFound' : 'errors.generic');
      message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message || messageKey;
      issues = payload.issues;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} → ${status}: ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
      );
    }

    if (response.headersSent) return;
    response.status(status).json({
      statusCode: status,
      messageKey,
      message,
      ...(issues ? { issues } : {}),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
