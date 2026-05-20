import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
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

  async createUser(email: string, name: string, password: string, isAdmin = false) {
    const hash = await bcrypt.hash(password, 12);
    const user = this.users.create({ email, name, passwordHash: hash, isAdmin });
    const saved = await this.users.save(user);
    return { id: saved.id, email: saved.email, name: saved.name, isAdmin: saved.isAdmin };
  }

  async resetUserPassword(id: string, newPassword: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const hash = await bcrypt.hash(newPassword, 12);
    await this.users.update(id, { passwordHash: hash });
    return { success: true };
  }

  async getUserFiles(userId: string) {
    const files = await this.files.find({
      where: { ownerId: userId, isTrashed: false },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return files.map(f => ({
      id: f.id, name: f.name, mimeType: f.mimeType,
      sizeBytes: Number(f.sizeBytes), createdAt: f.createdAt,
    }));
  }

  async getSystemHealth() {
    const [totalUsers, totalFiles] = await Promise.all([
      this.users.count(),
      this.files.count(),
    ]);
    const storageResult = await this.users
      .createQueryBuilder('u')
      .select('SUM(u.storageUsedBytes)', 'total')
      .getRawOne();
    const totalStorage = Number(storageResult?.total ?? 0);

    const trashedFiles = await this.files.count({ where: { isTrashed: true } });
    const adminCount   = await this.users.count({ where: { isAdmin: true } });
    const totp2faCount = await this.users.count({ where: { totpEnabled: true } });

    return {
      database:    'connected',
      totalUsers,  adminCount, totp2faCount,
      totalFiles,  trashedFiles,
      totalStorage,
      uptime: process.uptime(),
      nodeVersion: process.version,
      memory: process.memoryUsage(),
    };
  }
}
