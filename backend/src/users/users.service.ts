import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async create(email: string, password: string, name?: string): Promise<User> {
    const existing = await this.repo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.repo.create({ email, passwordHash, name });
    return this.repo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async updateName(id: string, name: string): Promise<User> {
    await this.repo.update(id, { name });
    return this.findById(id);
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.repo.update(id, { passwordHash });
  }

  async incrementStorage(userId: string, bytes: number): Promise<void> {
    await this.repo.increment({ id: userId }, 'storageUsedBytes', bytes);
  }

  async decrementStorage(userId: string, bytes: number): Promise<void> {
    await this.repo.decrement({ id: userId }, 'storageUsedBytes', bytes);
  }

  async setTotpSecret(id: string, secret: string): Promise<void> {
    await this.repo.update(id, { totpSecret: secret });
  }

  async enableTotp(id: string): Promise<void> {
    await this.repo.update(id, { totpEnabled: true });
  }

  async disableTotp(id: string): Promise<void> {
    await this.repo.update(id, { totpEnabled: false, totpSecret: undefined });
  }
}
