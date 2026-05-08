import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  OneToMany, CreateDateColumn, UpdateDateColumn, Index, JoinColumn,
} from 'typeorm';
import { ColumnType } from '../../common/database.utils';
import { User } from './user.entity';
import { Folder } from './folder.entity';
import { FileVersion } from './file-version.entity';
import { Share } from './share.entity';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column()
  mimeType: string;

  @Column({ type: ColumnType.BIGINT as any })
  sizeBytes: number;

  @Column()
  storageKey: string;

  @Column({ type: 'text', nullable: true })
  thumbnailKey: string | null;

  @Column({ type: 'text', nullable: true })
  sha256: string | null;

  @ManyToOne(() => User, (u) => u.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => Folder, (f) => f.files, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'folder_id' })
  folder: Folder;

  @Column({ type: 'text', name: 'folder_id', nullable: true })
  @Index()
  folderId: string | null;

  @OneToMany(() => FileVersion, (v) => v.file, { cascade: true })
  versions: FileVersion[];

  @OneToMany(() => Share, (s) => s.file)
  shares: Share[];

  @Column({ default: false })
  isStarred: boolean;

  @Column({ default: false })
  isTrashed: boolean;

  @Column({ type: ColumnType.DATETIME as any, nullable: true })
  trashedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
