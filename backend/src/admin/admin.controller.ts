import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, ForbiddenException, Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsString, IsOptional, Min, MinLength, IsEmail } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';

class UpdateQuotaDto  { @IsNumber() @Min(-1) quotaBytes: number; }
class UpdateAdminDto  { @IsBoolean() isAdmin: boolean; }
class ResetPwDto      { @IsString() @MinLength(6) password: string; }
class CreateUserDto   {
  @IsEmail()    email:    string;
  @IsString()   name:     string;
  @IsString() @MinLength(6) password: string;
  @IsBoolean() @IsOptional() isAdmin?: boolean;
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

  @Post('users')
  createUser(@Body() dto: CreateUserDto, @Request() req) {
    requireAdmin(req);
    return this.admin.createUser(dto.email, dto.name, dto.password, dto.isAdmin ?? false);
  }

  @Get('stats')
  stats(@Request() req) {
    requireAdmin(req);
    return this.admin.getStats();
  }

  @Get('health')
  health(@Request() req) {
    requireAdmin(req);
    return this.admin.getSystemHealth();
  }

  @Get('users/:id/files')
  userFiles(@Param('id') id: string, @Request() req) {
    requireAdmin(req);
    return this.admin.getUserFiles(id);
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

  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPwDto, @Request() req) {
    requireAdmin(req);
    if (id === req.user.id) throw new ForbiddenException('Use Settings to change your own password');
    return this.admin.resetUserPassword(id, dto.password);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Request() req) {
    requireAdmin(req);
    if (id === req.user.id) throw new ForbiddenException('Cannot delete own account');
    return this.admin.deleteUser(id);
  }
}
