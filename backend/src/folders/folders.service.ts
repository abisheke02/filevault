import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Folder } from '../database/entities/folder.entity';

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder) private readonly repo: Repository<Folder>,
  ) {}

  async create(name: string, ownerId: string, parentId?: string): Promise<Folder> {
    const folder = this.repo.create({ name, ownerId, parentId: parentId ?? undefined });
    return this.repo.save(folder);
  }

  async listChildren(ownerId: string, parentId?: string): Promise<Folder[]> {
    return this.repo.find({
      where: {
        ownerId,
        parentId: parentId ? parentId : IsNull(),
        isTrashed: false,
      },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, ownerId: string): Promise<Folder> {
    const folder = await this.repo.findOne({ where: { id } });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.ownerId !== ownerId) throw new ForbiddenException();
    return folder;
  }

  async rename(id: string, ownerId: string, name: string): Promise<Folder> {
    const folder = await this.findOne(id, ownerId);
    folder.name = name;
    return this.repo.save(folder);
  }

  async trash(id: string, ownerId: string): Promise<void> {
    const folder = await this.findOne(id, ownerId);
    folder.isTrashed = true;
    folder.trashedAt = new Date();
    await this.repo.save(folder);
  }

  async restore(id: string, ownerId: string): Promise<void> {
    const folder = await this.repo.findOne({ where: { id } });
    if (!folder || folder.ownerId !== ownerId) throw new NotFoundException();
    folder.isTrashed = false;
    folder.trashedAt = null;
    await this.repo.save(folder);
  }
}
