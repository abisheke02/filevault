import { Body, Controller, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

class UpdateProfileDto {
  @IsString() @MinLength(1) @MaxLength(100) name: string;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateMe(@Body() dto: UpdateProfileDto, @Request() req) {
    const user = await this.users.updateName(req.user.id, dto.name);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      storageUsedBytes: Number(user.storageUsedBytes),
      storageQuotaBytes: Number(user.storageQuotaBytes),
    };
  }
}
