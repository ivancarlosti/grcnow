import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { env } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.use(cookieParser());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.enableCors({
    origin: [env.appUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });
  app.enableShutdownHooks();

  if (env.authMethod === 'none') {
    new Logger('Bootstrap').warn('AUTH_METHOD=none — the whole dashboard is open (demo mode)');
  }
  if (process.env.RECAPTCHA_CLIENTID || process.env.RECAPTCHA_CLIENTSECRET) {
    new Logger('Bootstrap').warn(
      'RECAPTCHA_CLIENTID/RECAPTCHA_CLIENTSECRET are ignored: configure reCAPTCHA in Platform > Settings',
    );
  }

  await app.listen(env.port, '0.0.0.0');
  new Logger('Bootstrap').log(`API listening on http://0.0.0.0:${env.port} (auth=${env.authMethod})`);
}

void bootstrap();
