import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';
import Anthropic from '@anthropic-ai/sdk';

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

export type FileTypeFilter = 'all' | 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'other';
export type DateFilter     = 'any' | 'today' | 'week' | 'month';

const MIME_FILTERS: Record<FileTypeFilter, string[]> = {
  all:      [],
  image:    ['image/'],
  video:    ['video/'],
  audio:    ['audio/'],
  pdf:      ['application/pdf'],
  document: [
    'application/vnd.openxmlformats-officedocument',
    'application/msword',
    'application/vnd.ms',
    'text/plain',
    'text/csv',
  ],
  other: [],
};

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch;
  private ai: Anthropic | null = null;
  private readonly INDEX = 'files';

  constructor(private readonly cfg: ConfigService) {
    this.client = new MeiliSearch({
      host:   cfg.get('MEILI_HOST', 'http://meilisearch:7700'),
      apiKey: cfg.get('MEILI_MASTER_KEY'),
    });
    const key = cfg.get<string>('ANTHROPIC_API_KEY');
    if (key) this.ai = new Anthropic({ apiKey: key });
  }

  async onModuleInit() {
    try {
      await this.client.createIndex(this.INDEX, { primaryKey: 'id' }).catch(() => null);
      await this.client.index(this.INDEX).updateSettings({
        searchableAttributes: ['name', 'content'],
        filterableAttributes: ['ownerId', 'folderId', 'mimeType', 'createdAt'],
        sortableAttributes:   ['createdAt', 'sizeBytes', 'name'],
      });
      this.logger.log('Meilisearch index ready');
    } catch {
      this.logger.warn('Meilisearch unavailable — search disabled');
    }
  }

  async indexFile(doc: FileDoc) {
    return this.client.index(this.INDEX).addDocuments([doc]);
  }

  async deleteFile(id: string) {
    return this.client.index(this.INDEX).deleteDocument(id);
  }

  async search(
    query: string,
    ownerId: string,
    opts: {
      folderId?: string;
      fileType?: FileTypeFilter;
      dateFilter?: DateFilter;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const filter: string[] = [`ownerId = ${JSON.stringify(ownerId)}`];

    if (opts.folderId) filter.push(`folderId = ${JSON.stringify(opts.folderId)}`);

    // File type filter
    const mimes = MIME_FILTERS[opts.fileType ?? 'all'];
    if (mimes.length > 0) {
      const mimeFilter = mimes.map((m) => `mimeType CONTAINS ${JSON.stringify(m)}`).join(' OR ');
      filter.push(`(${mimeFilter})`);
    }

    // Date filter
    const now = Date.now();
    const dateMs: Record<DateFilter, number | null> = {
      any:   null,
      today: now - 86_400_000,
      week:  now - 7 * 86_400_000,
      month: now - 30 * 86_400_000,
    };
    const since = dateMs[opts.dateFilter ?? 'any'];
    if (since) filter.push(`createdAt > ${Math.floor(since)}`);

    return this.client.index(this.INDEX).search(query, {
      filter,
      limit:  opts.limit  ?? 50,
      offset: opts.offset ?? 0,
      attributesToHighlight: ['name', 'content'],
      highlightPreTag:  '<mark>',
      highlightPostTag: '</mark>',
      attributesToCrop: ['content'],
      cropLength: 30,
    });
  }

  // ── AI natural-language search ──────────────────────────────────────────────
  async aiSearch(query: string, ownerId: string): Promise<{
    keywords: string;
    fileType: FileTypeFilter;
    dateFilter: DateFilter;
    explanation: string;
    results: any;
  }> {
    let keywords = query;
    let fileType: FileTypeFilter = 'all';
    let dateFilter: DateFilter   = 'any';
    let explanation = '';

    if (this.ai) {
      const msg = await this.ai.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: `You are a file search assistant. Parse the user's natural language search query and return JSON with:
- "keywords": the core search keywords (string)
- "fileType": one of: all, image, video, audio, pdf, document, other
- "dateFilter": one of: any, today, week, month
- "explanation": one short sentence explaining what you're searching for

Return ONLY valid JSON, no other text.`,
        messages: [{ role: 'user', content: query }],
      });

      try {
        const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
        const parsed = JSON.parse(text);
        keywords    = parsed.keywords    ?? query;
        fileType    = parsed.fileType    ?? 'all';
        dateFilter  = parsed.dateFilter  ?? 'any';
        explanation = parsed.explanation ?? '';
      } catch {
        // fallback to raw query
      }
    }

    const results = await this.search(keywords, ownerId, { fileType, dateFilter });
    return { keywords, fileType, dateFilter, explanation, results };
  }
}
