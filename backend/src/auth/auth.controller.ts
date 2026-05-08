import { Body, Controller, Delete, Get, Post, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from './jwt-auth.guard';

class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

class TotpTokenDto {
  @IsString() token: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.name);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, dto.totpToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Request() req) {
    return this.auth.getUser(req.user.id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  changePassword(@Body() dto: ChangePasswordDto, @Request() req) {
    return this.auth.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  setup2fa(@Request() req) {
    return this.auth.setup2fa(req.user.id);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  enable2fa(@Body() dto: TotpTokenDto, @Request() req) {
    return this.auth.enable2fa(req.user.id, dto.token);
  }

  @Delete('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  disable2fa(@Body() dto: TotpTokenDto, @Request() req) {
    return this.auth.disable2fa(req.user.id, dto.token);
  }
}
