import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { File } from '../database/entities/file.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(File) private readonly files: Repository<File>,
  ) {}

  async listUsers() {
    const users = await this.users.find({ order: { createdAt: 'DESC' } });
    return users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isAdmin: u.isAdmin,
      totpEnabled: u.totpEnabled,
      storageUsedBytes: Number(u.storageUsedBytes),
      storageQuotaBytes: Number(u.storageQuotaBytes),
      createdAt: u.createdAt,
    }));
  }

  async getStats() {
    const [totalUsers, totalFiles] = await Promise.all([
      this.users.count(),
      this.files.count({ where: { isTrashed: false } }),
    ]);
    const storageResult = await this.users
      .createQueryBuilder('u')
      .select('SUM(u.storageUsedBytes)', 'total')
      .getRawOne();

    return {
      totalUsers,
      totalFiles,
      totalStorageBytes: Number(storageResult?.total ?? 0),
    };
  }

  async setQuota(id: string, quotaBytes: number) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.users.update(id, { storageQuotaBytes: quotaBytes });
    return { id, storageQuotaBytes: quotaBytes };
  }

  async setAdmin(id: string, isAdmin: boolean) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.users.update(id, { isAdmin });
    return { id, isAdmin };
  }

  async deleteUser(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.users.remove(user);
  }
}
