import {
  Controller, Get, Patch, Delete, Param, Body,
  UseGuards, ForbiddenException, Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';

class UpdateQuotaDto {
  @IsNumber() @Min(-1) quotaBytes: number;
}

class UpdateAdminDto {
  @IsBoolean() isAdmin: boolean;
}

function requireAdmin(req: any) {
  if (!req.user?.isAdmin) throw new ForbiddenException('Admin only');
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers(@Request() req) {
    requireAdmin(req);
    return this.admin.listUsers();
  }

  @Get('stats')
  stats(@Request() req) {
    requireAdmin(req);
    return this.admin.getStats();
  }

  @Patch('users/:id/quota')
  setQuota(@Param('id') id: string, @Body() dto: UpdateQuotaDto, @Request() req) {
    requireAdmin(req);
    return this.admin.setQuota(id, dto.quotaBytes);
  }

  @Patch('users/:id/admin')
  setAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto, @Request() req) {
    requireAdmin(req);
    if (id === req.user.id) throw new ForbiddenException('Cannot change own admin status');
    return this.admin.setAdmin(id, dto.isAdmin);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Request() req) {
    requireAdmin(req);
    if (id === req.user.id) throw new ForbiddenException('Cannot delete own account');
    return this.admin.deleteUser(id);
  }
}
