import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from '../database/entities/file.entity';
import { FileVersion } from '../database/entities/file-version.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { UsersModule } from '../users/users.module';
import { QueueModule } from '../queue/queue.module';
import { FoldersModule } from '../folders/folders.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([File, FileVersion]), UsersModule, QueueModule, FoldersModule, EventsModule],
  providers: [FilesService],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule {}
