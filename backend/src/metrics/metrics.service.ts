import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new client.Registry();

  readonly uploadsTotal = new client.Counter({
    name: 'filevault_uploads_total',
    help: 'Total number of file uploads',
    labelNames: ['status'],
    registers: [this.registry],
  });

  readonly downloadsTotal = new client.Counter({
    name: 'filevault_downloads_total',
    help: 'Total number of file downloads',
    registers: [this.registry],
  });

  readonly authTotal = new client.Counter({
    name: 'filevault_auth_total',
    help: 'Total number of auth events',
    labelNames: ['type', 'status'],
    registers: [this.registry],
  });

  readonly storageUsedGauge = new client.Gauge({
    name: 'filevault_storage_used_bytes',
    help: 'Total storage used across all users in bytes',
    registers: [this.registry],
  });

  readonly activeConnectionsGauge = new client.Gauge({
    name: 'filevault_ws_connections',
    help: 'Number of active WebSocket connections',
    registers: [this.registry],
  });

  onModuleInit() {
    client.collectDefaultMetrics({ register: this.registry, prefix: 'filevault_node_' });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
