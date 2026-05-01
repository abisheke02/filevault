import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { FoldersService } from './folders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional } from 'class-validator';

class CreateFolderDto {
  @IsString() name: string;
  @IsString() @IsOptional() parentId?: string;
}

class RenameFolderDto {
  @IsString() name: string;
}

@ApiTags('folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Post()
  create(@Body() dto: CreateFolderDto, @Request() req) {
    return this.folders.create(dto.name, req.user.id, dto.parentId);
  }

  @Get()
  @ApiQuery({ name: 'parentId', required: false })
  list(@Query('parentId') parentId: string, @Request() req) {
    return this.folders.listChildren(req.user.id, parentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.folders.findOne(id, req.user.id);
  }

  @Patch(':id')
  rename(@Param('id') id: string, @Body() dto: RenameFolderDto, @Request() req) {
    return this.folders.rename(id, req.user.id, dto.name);
  }

  @Delete(':id')
  trash(@Param('id') id: string, @Request() req) {
    return this.folders.trash(id, req.user.id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @Request() req) {
    return this.folders.restore(id, req.user.id);
  }
}
