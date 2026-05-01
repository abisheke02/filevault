import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, JoinColumn,
} from 'typeorm';
import { ColumnType } from '../../common/database.utils';
import { File } from './file.entity';

@Entity('file_versions')
export class FileVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => File, (f) => f.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: File;

  @Column({ name: 'file_id' })
  fileId: string;

  @Column()
  storageKey: string;

  @Column({ type: ColumnType.BIGINT as any })
  sizeBytes: number;

  @Column({ type: 'text', nullable: true })
  sha256: string | null;

  @Column({ default: 1 })
  versionNumber: number;

  @CreateDateColumn()
  createdAt: Date;
}
