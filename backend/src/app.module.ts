import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { FoldersModule } from './folders/folders.module';
import { SharesModule } from './shares/shares.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { SearchModule } from './search/search.module';
import { QueueModule } from './queue/queue.module';
import { HealthModule } from './health/health.module';
import { EventsModule } from './events/events.module';
import { MetricsModule } from './metrics/metrics.module';
import { AdminModule } from './admin/admin.module';
import { User } from './database/entities/user.entity';
import { File } from './database/entities/file.entity';
import { FileVersion } from './database/entities/file-version.entity';
import { Folder } from './database/entities/folder.entity';
import { Share } from './database/entities/share.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const url = cfg.get('DATABASE_URL');
        const isSqlite = url?.startsWith('sqlite');
        
        return {
          type: isSqlite ? 'sqlite' : 'postgres',
          url: isSqlite ? undefined : url,
          database: isSqlite ? url.replace('sqlite://', '') : undefined,
          entities: [User, File, FileVersion, Folder, Share],
          synchronize: false,
          migrations: ['src/database/migrations/*.ts'],
          migrationsRun: true,
          ssl: !isSqlite && cfg.get('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
          logging: cfg.get('NODE_ENV') === 'development',
          retryAttempts: 5,
          retryDelay: 3000,
        } as TypeOrmModuleOptions;
      },
    }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    AuthModule,
    UsersModule,
    FoldersModule,
    FilesModule,
    SharesModule,
    StorageModule,
    SearchModule,
    QueueModule,
    HealthModule,
    EventsModule,
    MetricsModule,
    AdminModule,
  ],
})
export class AppModule {}
