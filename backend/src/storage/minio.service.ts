import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly cfg: ConfigService) {
    this.bucket = cfg.get('MINIO_BUCKET', 'filevault-data');
    this.client = new Minio.Client({
      endPoint: cfg.get('MINIO_ENDPOINT', 'minio'),
      port: parseInt(cfg.get('MINIO_PORT', '9000')),
      useSSL: cfg.get('MINIO_USE_SSL') === 'true',
      accessKey: cfg.get('MINIO_ACCESS_KEY', ''),
      secretKey: cfg.get('MINIO_SECRET_KEY', ''),
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created bucket: ${this.bucket}`);
      }
    } catch (e) {
      this.logger.warn('Failed to connect to MinIO. Storage features will be unavailable.');
    }
  }

  async putObject(key: string, stream: Readable | Buffer, size: number, mime: string) {
    await this.client.putObject(this.bucket, key, stream, size, { 'Content-Type': mime });
  }

  async getObject(key: string): Promise<Readable> {
    return this.client.getObject(this.bucket, key);
  }

  async removeObject(key: string) {
    await this.client.removeObject(this.bucket, key);
  }

  async presignedGetUrl(key: string, expirySecs = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySecs);
  }

  async statObject(key: string) {
    return this.client.statObject(this.bucket, key);
  }
}
