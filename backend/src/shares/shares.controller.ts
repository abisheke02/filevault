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
  @IsString() fileId: string;
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
    return this.shares.create(dto.fileId, req.user.id, {
      permission: dto.permission,
      password: dto.password,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
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

  // Public endpoint — no auth required
  @Get(':token/info')
  async info(@Param('token') token: string, @Query('password') password: string) {
    const share = await this.shares.resolve(token, password);
    const { file } = share;
    return {
      id: share.id,
      permission: share.permission,
      passwordRequired: !!share.passwordHash,
      expiresAt: share.expiresAt,
      file: file ? { name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes } : null,
    };
  }

  @Get(':token/download')
  async download(
    @Param('token') token: string,
    @Query('password') password: string,
    @Res() res: Response,
  ) {
    const share = await this.shares.resolve(token, password);
    if (!share.fileId) { res.status(400).json({ message: 'No file attached to share' }); return; }
    const { stream, file } = await this.files.getStream(share.fileId, share.createdById);
    await this.shares.incrementDownload(token);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Type', file.mimeType);
    stream.pipe(res);
  }
}
