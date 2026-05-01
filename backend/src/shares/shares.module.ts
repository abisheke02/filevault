import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Share } from '../database/entities/share.entity';
import { FilesModule } from '../files/files.module';
import { SharesService } from './shares.service';
import { SharesController } from './shares.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Share]), FilesModule],
  providers: [SharesService],
  controllers: [SharesController],
})
export class SharesModule {}
