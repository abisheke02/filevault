import {
  Controller, Post, Get, Delete, Param, Body, Query,
  UseGuards, Request, Res, HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { IsOptional, IsString, IsDateString, IsNumber, IsEnum } from 'class-validator';
import { SharesService } from './shares.service';
import { FilesService } from '../files/files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SharePermission } from '../database/entities/share.entity';

class CreateShareDto {
  @IsString() @IsOptional() fileId?: string;
  @IsString() @IsOptional() folderId?: string;
  @IsEnum(['view', 'download', 'upload']) @IsOptional() permission?: SharePermission;
  @IsString() @IsOptional() password?: string;
  @IsDateString() @IsOptional() expiresAt?: string;
  @IsNumber() @IsOptional() maxDownloads?: number;
}

@ApiTags('shares')
@Controller('shares')
export class SharesController {
  constructor(
    private readonly shares: SharesService,
    private readonly files: FilesService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateShareDto, @Request() req) {
    return this.shares.create(req.user.id, {
      fileId:       dto.fileId,
      folderId:     dto.folderId,
      permission:   dto.permission,
      password:     dto.password,
      expiresAt:    dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      maxDownloads: dto.maxDownloads,
    });
  }

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(@Request() req) {
    return this.shares.listByOwner(req.user.id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  revoke(@Param('id') id: string, @Request() req) {
    return this.shares.revoke(id, req.user.id);
  }

  // ── Public endpoints (no auth) ──────────────────────────────────────────

  @Get(':token/info')
  async info(@Param('token') token: string, @Query('password') password: string) {
    const share = await this.shares.resolve(token, password);

    const base = {
      id:               share.id,
      permission:       share.permission,
      passwordRequired: !!share.passwordHash,
      expiresAt:        share.expiresAt,
      type:             share.folderId ? 'folder' : 'file',
    };

    if (share.folderId) {
      const folder = await this.shares.getFolderContents(
        share.folderId,
        share.createdById,
      );
      return { ...base, folder, file: null };
    }

    const { file } = share;
    return {
      ...base,
      file: file
        ? { name: file.name, mimeType: file.mimeType, sizeBytes: Number(file.sizeBytes) }
        : null,
      folder: null,
    };
  }

  @Get(':token/thumbnail/:fileId')
  async thumbnail(
    @Param('token') token: string,
    @Param('fileId') fileId: string,
    @Query('password') password: string,
    @Res() res: Response,
  ) {
    try {
      const share = await this.shares.resolve(token, password);
      const { stream } = await this.files.getStream(fileId, share.createdById);
      // Just get thumbnail via files service
      const file = await this.files.findOne(fileId, share.createdById);
      if (!file.thumbnailKey) { res.status(204).end(); return; }
      const thumbStream = await this.files.getThumbnailStream(file.thumbnailKey);
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      thumbStream.pipe(res);
      stream.destroy();
    } catch {
      res.status(204).end();
    }
  }

  @Get(':token/download')
  async download(
    @Param('token') token: string,
    @Query('password') password: string,
    @Query('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const share = await this.shares.resolve(token, password);

    // For folder shares, fileId query param selects which file to download
    const targetFileId = share.fileId ?? fileId;
    if (!targetFileId) {
      res.status(400).json({ message: 'No file specified' });
      return;
    }

    const { stream, file } = await this.files.getStream(targetFileId, share.createdById);
    await this.shares.incrementDownload(token);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(file.sizeBytes));
    stream.pipe(res);
  }
}
