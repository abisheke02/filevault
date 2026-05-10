import {
  Controller, Get, Post, Patch, Delete, Param, Query,
  UseGuards, Request, UseInterceptors, UploadedFile,
  Body, Res, StreamableFile, HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { FilesService } from './files.service';
import { FoldersService } from '../folders/folders.service';
import { SearchService } from '../search/search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional } from 'class-validator';

class RenameDto { @IsString() name: string; }
class MoveDto { @IsString() @IsOptional() folderId?: string; }

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(
    private readonly files: FilesService,
    private readonly folders: FoldersService,
    private readonly search: SearchService,
  ) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 * 1024 } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folderId') folderId: string,
    @Request() req,
  ) {
    return this.files.upload(
      req.user.id, folderId, file.originalname, file.mimetype, file.buffer,
    );
  }

  @Get()
  @ApiQuery({ name: 'folderId', required: false })
  async list(@Query('folderId') folderId: string, @Request() req) {
    const [files, folders] = await Promise.all([
      this.files.listFolder(req.user.id, folderId),
      this.folders.listChildren(req.user.id, folderId),
    ]);
    return { files, folders, total: files.length + folders.length };
  }

  @Get('trash')
  listTrash(@Request() req) {
    return this.files.listTrashed(req.user.id);
  }

  @Get('starred')
  async listStarred(@Request() req) {
    const files = await this.files.listStarred(req.user.id);
    return { files, folders: [], total: files.length };
  }

  @Patch(':id/star')
  star(@Param('id') id: string, @Request() req) {
    return this.files.toggleStar(id, req.user.id);
  }

  @Get('search')
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'folderId', required: false })
  searchFiles(
    @Query('q') q: string,
    @Query('folderId') folderId: string,
    @Request() req,
  ) {
    return this.search.search(q, req.user.id, { folderId });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.files.findOne(id, req.user.id);
  }

  @Get(':id/thumbnail')
  async thumbnail(@Param('id') id: string, @Request() req, @Res() res: Response) {
    try {
      await this.files.findOne(id, req.user.id); // verify ownership
      // Always try the standard thumbnail key — worker saves to thumbs/:id.webp
      const thumbKey = `thumbs/${id}.webp`;
      const stream = await this.files.getThumbnailStream(thumbKey);
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      stream.pipe(res);
    } catch {
      res.status(204).end();
    }
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const { stream, file } = await this.files.getStream(id, req.user.id);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(file.sizeBytes));
    stream.pipe(res);
  }

  @Get(':id/url')
  getUrl(@Param('id') id: string, @Request() req) {
    return this.files.getPresignedUrl(id, req.user.id).then((url) => ({ url }));
  }

  @Get(':id/versions')
  versions(@Param('id') id: string, @Request() req) {
    return this.files.listVersions(id, req.user.id);
  }

  @Patch(':id/rename')
  rename(@Param('id') id: string, @Body() dto: RenameDto, @Request() req) {
    return this.files.rename(id, req.user.id, dto.name);
  }

  @Patch(':id/move')
  move(@Param('id') id: string, @Body() dto: MoveDto, @Request() req) {
    return this.files.move(id, req.user.id, dto.folderId ?? null);
  }

  @Delete(':id')
  @HttpCode(204)
  trash(@Param('id') id: string, @Request() req) {
    return this.files.trash(id, req.user.id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @Request() req) {
    return this.files.restore(id, req.user.id);
  }

  @Delete(':id/permanent')
  @HttpCode(204)
  hardDelete(@Param('id') id: string, @Request() req) {
    return this.files.hardDelete(id, req.user.id);
  }
}
