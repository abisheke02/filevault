import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import Redis from 'ioredis';
import * as Minio from 'minio';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly cfg: ConfigService,
  ) {}

  @Get()
  async check() {
    const results: Record<string, { status: 'ok' | 'error'; detail?: string }> = {};

    // Database
    try {
      await this.db.query('SELECT 1');
      results.database = { status: 'ok' };
    } catch (e: any) {
      results.database = { status: 'error', detail: e.message };
    }

    // Redis
    try {
      const redis = new Redis(this.cfg.get<string>('REDIS_URL', 'redis://127.0.0.1:6379'), {
        lazyConnect: true, connectTimeout: 3000,
      });
      await redis.connect();
      await redis.ping();
      await redis.quit();
      results.redis = { status: 'ok' };
    } catch (e: any) {
      results.redis = { status: 'error', detail: e.message };
    }

    // MinIO
    try {
      const mc = new Minio.Client({
        endPoint: this.cfg.get('MINIO_ENDPOINT', '127.0.0.1'),
        port: parseInt(this.cfg.get('MINIO_PORT', '9000')),
        useSSL: this.cfg.get('MINIO_USE_SSL') === 'true',
        accessKey: this.cfg.get('MINIO_ACCESS_KEY', ''),
        secretKey: this.cfg.get('MINIO_SECRET_KEY', ''),
      });
      await mc.bucketExists(this.cfg.get('MINIO_BUCKET', 'filevault-data'));
      results.minio = { status: 'ok' };
    } catch (e: any) {
      results.minio = { status: 'error', detail: e.message };
    }

    // Meilisearch
    try {
      const res = await fetch(`${this.cfg.get('MEILI_HOST', 'http://127.0.0.1:7700')}/health`);
      const body = await res.json() as { status: string };
      results.meilisearch = body.status === 'available'
        ? { status: 'ok' }
        : { status: 'error', detail: body.status };
    } catch (e: any) {
      results.meilisearch = { status: 'error', detail: e.message };
    }

    const allOk = Object.values(results).every(r => r.status === 'ok');
    return { status: allOk ? 'ok' : 'degraded', services: results };
  }
}
