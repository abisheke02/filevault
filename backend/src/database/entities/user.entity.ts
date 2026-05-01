import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { ColumnType } from '../../common/database.utils';
import { Exclude } from 'class-transformer';
import { File } from './file.entity';
import { Folder } from './folder.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column()
  @Exclude()
  passwordHash: string;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: false })
  totpEnabled: boolean;

  @Column({ type: 'text', nullable: true })
  @Exclude()
  totpSecret: string;

  @Column({ type: ColumnType.BIGINT as any, default: 0 })
  storageUsedBytes: number;

  @Column({ type: ColumnType.BIGINT as any, default: -1 })
  storageQuotaBytes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => File, (f) => f.owner)
  files: File[];

  @OneToMany(() => Folder, (f) => f.owner)
  folders: Folder[];
}
