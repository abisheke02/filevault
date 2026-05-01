import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  OneToMany, CreateDateColumn, UpdateDateColumn, Index, JoinColumn,
} from 'typeorm';
import { ColumnType } from '../../common/database.utils';
import { User } from './user.entity';
import { File } from './file.entity';

@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => User, (u) => u.folders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => Folder, (f) => f.children, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Folder;

  @Column({ type: 'text', name: 'parent_id', nullable: true })
  @Index()
  parentId: string | null;

  @OneToMany(() => Folder, (f) => f.parent)
  children: Folder[];

  @OneToMany(() => File, (f) => f.folder)
  files: File[];

  @Column({ default: false })
  isTrashed: boolean;

  @Column({ type: ColumnType.DATETIME as any, nullable: true })
  trashedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
