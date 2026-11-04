import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../config';

type Handler = (payload: any) => Promise<void>;

/**
 * BullMQ wrapper with a graceful inline fallback.
 * When REDIS_URL is empty (or Redis is unreachable) jobs execute in-process so
 * the platform keeps working in small single-node deployments.
 */
@Injectable()
export class QueuesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueuesService.name);
  private readonly handlers = new Map<string, Handler>();
  private queue?: Queue;
  private worker?: Worker;
  private connection?: IORedis;
  private redisAvailable = false;

  register(name: string, handler: Handler) {
    this.handlers.set(name, handler);
  }

  onModuleInit() {
    if (!env.redisUrl) {
      this.logger.log('REDIS_URL not set — background jobs run inline');
      return;
    }
    try {
      this.connection = new IORedis(env.redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        retryStrategy: (times) => (times > 3 ? null : 500),
      });
      this.connection.on('error', (err) => {
        if (this.redisAvailable) this.logger.warn(`Redis error: ${err.message}`);
        this.redisAvailable = false;
      });
      this.connection.on('ready', () => {
        this.redisAvailable = true;
        this.logger.log('Redis connected — BullMQ queue active');
      });
      void this.connection.connect().catch(() => {
        this.logger.warn('Redis unavailable — falling back to inline jobs');
        this.redisAvailable = false;
      });

      this.queue = new Queue('grc-jobs', { connection: this.connection });
      this.worker = new Worker(
        'grc-jobs',
        async (job) => {
          const handler = this.handlers.get(job.name);
          if (handler) await handler(job.data);
        },
        { connection: this.connection, concurrency: 5 },
      );
      this.worker.on('failed', (job, err) => this.logger.warn(`Job ${job?.name} failed: ${err.message}`));
    } catch (err) {
      this.logger.warn(`Queue init failed: ${(err as Error).message}`);
    }
  }

  async add(name: string, payload: any) {
    if (this.queue && this.redisAvailable) {
      try {
        await this.queue.add(name, payload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 200,
          removeOnFail: 200,
        });
        return;
      } catch (err) {
        this.logger.warn(`Queue add failed (${(err as Error).message}), running inline`);
      }
    }
    const handler = this.handlers.get(name);
    if (handler) {
      try {
        await handler(payload);
      } catch (err) {
        this.logger.warn(`Inline job ${name} failed: ${(err as Error).message}`);
      }
    }
  }

  async onModuleDestroy() {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    this.connection?.disconnect();
  }
}
