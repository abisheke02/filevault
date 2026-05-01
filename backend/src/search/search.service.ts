import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';

interface FileDoc {
  id: string;
  name: string;
  mimeType: string;
  ownerId: string;
  folderId: string | null;
  sizeBytes: number;
  content?: string;
  createdAt: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch;
  private readonly INDEX = 'files';

  constructor(private readonly cfg: ConfigService) {
    this.client = new MeiliSearch({
      host: cfg.get('MEILI_HOST', 'http://meilisearch:7700'),
      apiKey: cfg.get('MEILI_MASTER_KEY'),
    });
  }

  async onModuleInit() {
    try {
      await this.client.createIndex(this.INDEX, { primaryKey: 'id' }).catch(() => null);
      const index = this.client.index(this.INDEX);
      await index.updateSettings({
        searchableAttributes: ['name', 'content'],
        filterableAttributes: ['ownerId', 'folderId', 'mimeType'],
        sortableAttributes: ['createdAt', 'sizeBytes', 'name'],
      });
      this.logger.log('Meilisearch index ready');
    } catch (e) {
      this.logger.warn('Failed to connect to Meilisearch. Search features will be unavailable.');
    }
  }

  async indexFile(doc: FileDoc) {
    return this.client.index(this.INDEX).addDocuments([doc]);
  }

  async deleteFile(id: string) {
    return this.client.index(this.INDEX).deleteDocument(id);
  }

  async search(query: string, ownerId: string, opts: { folderId?: string; limit?: number; offset?: number } = {}) {
    const filter = [`ownerId = ${JSON.stringify(ownerId)}`];
    if (opts.folderId) filter.push(`folderId = ${JSON.stringify(opts.folderId)}`);

    return this.client.index(this.INDEX).search(query, {
      filter,
      limit: opts.limit ?? 50,
      offset: opts.offset ?? 0,
    });
  }
}
