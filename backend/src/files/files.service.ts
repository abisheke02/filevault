import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { File } from '../database/entities/file.entity';
import { FileVersion } from '../database/entities/file-version.entity';
import { MinioService } from '../storage/minio.service';
import { SearchService } from '../search/search.service';
import { UsersService } from '../users/users.service';
import { QueueService } from '../queue/queue.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File) private readonly fileRepo: Repository<File>,
    @InjectRepository(FileVersion) private readonly versionRepo: Repository<FileVersion>,
    private readonly storage: MinioService,
    private readonly search: SearchService,
    private readonly users: UsersService,
    private readonly queue: QueueService,
    private readonly events: EventsService,
  ) {}

  async upload(
    ownerId: string,
    folderId: string | undefined,
    originalName: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<File> {
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const storageKey = `files/${ownerId}/${uuidv4()}/${originalName}`;

    await this.storage.putObject(storageKey, Readable.from(buffer), buffer.length, mimeType);

    const existing = await this.fileRepo.findOne({
      where: { name: originalName, ownerId, folderId: folderId ?? IsNull(), isTrashed: false },
      relations: ['versions'],
    });

    let file: File;
    if (existing) {
      // new version
      const versionNumber = (existing.versions?.length ?? 0) + 1;
      const version = this.versionRepo.create({
        file: existing,
        storageKey: existing.storageKey,
        sizeBytes: existing.sizeBytes,
        sha256: existing.sha256,
        versionNumber,
      });
      await this.versionRepo.save(version);
      existing.storageKey = storageKey;
      existing.sizeBytes = buffer.length;
      existing.sha256 = sha256;
      existing.mimeType = mimeType;
      file = await this.fileRepo.save(existing);
    } else {
      file = this.fileRepo.create({
        name: originalName, mimeType, sizeBytes: buffer.length,
        storageKey, sha256, ownerId, folderId: folderId ?? undefined,
      });
      file = await this.fileRepo.save(file);
      await this.users.incrementStorage(ownerId, buffer.length);
    }

    await this.search.indexFile({
      id: file.id, name: file.name, mimeType: file.mimeType,
      ownerId, folderId: folderId ?? null, sizeBytes: buffer.length,
      createdAt: file.createdAt.getTime(),
    });

    // Enqueue background jobs for thumbnail generation and deep text indexing
    await this.queue.enqueueThumbnail({ fileId: file.id, storageKey, mimeType, ownerId });
    await this.queue.enqueueIndexer({
      fileId: file.id, storageKey, mimeType,
      name: originalName, ownerId, folderId: folderId ?? null, sizeBytes: buffer.length,
    });

    this.events.emitFile(ownerId, {
      type: existing ? 'file:updated' : 'file:created',
      payload: { id: file.id, name: file.name, folderId: file.folderId },
    });

    return file;
  }

  async listRecent(ownerId: string): Promise<File[]> {
    return this.fileRepo.find({
      where: { ownerId, isTrashed: false },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async listFolder(ownerId: string, folderId?: string): Promise<File[]> {
    return this.fileRepo.find({
      where: {
        ownerId,
        folderId: folderId ? folderId : IsNull(),
        isTrashed: false,
      },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, ownerId: string): Promise<File> {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    if (file.ownerId !== ownerId) throw new ForbiddenException();
    return file;
  }

  async getStream(id: string, ownerId: string): Promise<{ stream: Readable; file: File }> {
    const file = await this.findOne(id, ownerId);
    const stream = await this.storage.getObject(file.storageKey);
    return { stream, file };
  }

  async getThumbnailStream(thumbnailKey: string) {
    return this.storage.getObject(thumbnailKey);
  }

  async getPresignedUrl(id: string, ownerId: string): Promise<string> {
    const file = await this.findOne(id, ownerId);
    return this.storage.presignedGetUrl(file.storageKey, 3600);
  }

  async rename(id: string, ownerId: string, name: string): Promise<File> {
    const file = await this.findOne(id, ownerId);
    if (!name.trim()) throw new BadRequestException('Name cannot be empty');
    file.name = name.trim();
    const saved = await this.fileRepo.save(file);
    await this.search.indexFile({
      id: saved.id, name: saved.name, mimeType: saved.mimeType,
      ownerId, folderId: saved.folderId, sizeBytes: Number(saved.sizeBytes),
      createdAt: saved.createdAt.getTime(),
    });
    return saved;
  }

  async move(id: string, ownerId: string, folderId: string | null): Promise<File> {
    const file = await this.findOne(id, ownerId);
    file.folderId = folderId;
    return this.fileRepo.save(file);
  }

  async trash(id: string, ownerId: string): Promise<void> {
    const file = await this.findOne(id, ownerId);
    file.isTrashed = true;
    file.trashedAt = new Date();
    await this.fileRepo.save(file);
    await this.search.deleteFile(id);
    this.events.emitFile(ownerId, { type: 'file:deleted', payload: { id } });
  }

  async restore(id: string, ownerId: string): Promise<void> {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file || file.ownerId !== ownerId) throw new NotFoundException();
    file.isTrashed = false;
    file.trashedAt = null;
    await this.fileRepo.save(file);
    await this.search.indexFile({
      id: file.id, name: file.name, mimeType: file.mimeType,
      ownerId, folderId: file.folderId, sizeBytes: Number(file.sizeBytes),
      createdAt: file.createdAt.getTime(),
    });
    this.events.emitFile(ownerId, { type: 'file:restored', payload: { id, folderId: file.folderId } });
  }

  async hardDelete(id: string, ownerId: string): Promise<void> {
    const file = await this.findOne(id, ownerId);
    await this.storage.removeObject(file.storageKey);
    await this.fileRepo.remove(file);
    await this.users.decrementStorage(ownerId, Number(file.sizeBytes));
    await this.search.deleteFile(id);
  }

  async listVersions(id: string, ownerId: string): Promise<FileVersion[]> {
    await this.findOne(id, ownerId);
    return this.versionRepo.find({ where: { fileId: id }, order: { versionNumber: 'DESC' } });
  }

  async listTrashed(ownerId: string): Promise<File[]> {
    return this.fileRepo.find({ where: { ownerId, isTrashed: true }, order: { trashedAt: 'DESC' } });
  }

  async toggleStar(id: string, ownerId: string): Promise<File> {
    const file = await this.findOne(id, ownerId);
    file.isStarred = !file.isStarred;
    return this.fileRepo.save(file);
  }

  async listStarred(ownerId: string): Promise<File[]> {
    return this.fileRepo.find({
      where: { ownerId, isStarred: true, isTrashed: false },
      order: { name: 'ASC' },
    });
  }
}
