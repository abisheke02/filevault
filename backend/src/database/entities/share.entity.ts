import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, JoinColumn, Index,
} from 'typeorm';
import { ColumnType } from '../../common/database.utils';
import { File } from './file.entity';
import { User } from './user.entity';

export type SharePermission = 'view' | 'download' | 'upload';

@Entity('shares')
export class Share {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  token: string;

  @ManyToOne(() => File, (f) => f.shares, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: File | null;

  @Column({ name: 'file_id', nullable: true })
  fileId: string | null;

  @Column({ type: 'text', nullable: true })
  folderId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @Column({ type: process.env.DATABASE_URL?.startsWith('sqlite') ? 'text' : 'enum', enum: ['view', 'download', 'upload'], default: 'download' })
  permission: SharePermission;

  @Column({ type: 'text', nullable: true })
  passwordHash: string | null;

  @Column({ type: ColumnType.DATETIME as any, nullable: true })
  expiresAt: Date | null;

  @Column({ default: 0 })
  downloadCount: number;

  @Column({ type: 'integer', nullable: true })
  maxDownloads: number | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
