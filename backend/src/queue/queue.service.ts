import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface ThumbnailJob {
  fileId: string;
  storageKey: string;
  mimeType: string;
  ownerId: string;
}

export interface IndexerJob {
  fileId: string;
  storageKey: string;
  mimeType: string;
  name: string;
  ownerId: string;
  folderId: string | null;
  sizeBytes: number;
}

const THUMB_QUEUE  = 'fv:queue:thumbnails';
const INDEX_QUEUE  = 'fv:queue:indexer';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private redis: Redis;

  constructor(private readonly cfg: ConfigService) {}

  onModuleInit() {
    const url = this.cfg.get<string>('REDIS_URL', 'redis://127.0.0.1:6379');
    this.redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 3, enableOfflineQueue: false });
    let warnedOnce = false;
    this.redis.on('error', (e) => {
      if (!warnedOnce) {
        this.logger.warn(`Redis unavailable — background jobs disabled. (${e.message})`);
        warnedOnce = true;
      }
    });
    this.redis.on('connect', () => {
      warnedOnce = false;
      this.logger.log('Redis queue connected');
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async enqueueThumbnail(job: ThumbnailJob): Promise<void> {
    await this.redis.lpush(THUMB_QUEUE, JSON.stringify(job));
  }

  async enqueueIndexer(job: IndexerJob): Promise<void> {
    await this.redis.lpush(INDEX_QUEUE, JSON.stringify(job));
  }
}
