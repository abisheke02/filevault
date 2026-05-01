import {
  Injectable, NotFoundException, ForbiddenException, GoneException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Share, SharePermission } from '../database/entities/share.entity';
import { FilesService } from '../files/files.service';

@Injectable()
export class SharesService {
  constructor(
    @InjectRepository(Share) private readonly repo: Repository<Share>,
    private readonly files: FilesService,
  ) {}

  async create(
    fileId: string,
    createdById: string,
    opts: {
      permission?: SharePermission;
      password?: string;
      expiresAt?: Date;
      maxDownloads?: number;
    } = {},
  ): Promise<Share> {
    // verify ownership
    await this.files.findOne(fileId, createdById);

    const share = this.repo.create({
      token: uuidv4(),
      fileId,
      createdById,
      permission: opts.permission ?? 'download',
      passwordHash: opts.password ? await bcrypt.hash(opts.password, 10) : null,
      expiresAt: opts.expiresAt ?? null,
      maxDownloads: opts.maxDownloads ?? null,
    });
    return this.repo.save(share);
  }

  async resolve(token: string, password?: string): Promise<Share> {
    const share = await this.repo.findOne({ where: { token, isActive: true }, relations: ['file'] });
    if (!share) throw new NotFoundException('Share not found');

    if (share.expiresAt && share.expiresAt < new Date()) throw new GoneException('Share link has expired');
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads)
      throw new GoneException('Download limit reached');

    if (share.passwordHash) {
      if (!password || !(await bcrypt.compare(password, share.passwordHash)))
        throw new ForbiddenException('Invalid password');
    }

    return share;
  }

  async incrementDownload(token: string): Promise<void> {
    await this.repo.increment({ token }, 'downloadCount', 1);
  }

  async listByOwner(createdById: string): Promise<Share[]> {
    return this.repo.find({ where: { createdById }, order: { createdAt: 'DESC' } });
  }

  async revoke(id: string, createdById: string): Promise<void> {
    const share = await this.repo.findOne({ where: { id } });
    if (!share || share.createdById !== createdById) throw new NotFoundException();
    share.isActive = false;
    await this.repo.save(share);
  }
}
