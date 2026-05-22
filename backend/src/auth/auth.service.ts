import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { TotpService } from './totp.service';
import { EmailService } from '../email/email.service';
import { User } from '../database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly totp: TotpService,
    private readonly cfg: ConfigService,
    private readonly email: EmailService,
  ) {}

  async register(email: string, password: string, name?: string) {
    const user = await this.users.create(email, password, name);
    return this.issueToken(user);
  }

  async login(email: string, password: string, totpToken?: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !(await this.users.validatePassword(user, password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.totpEnabled) {
      if (!totpToken) {
        return { needsTotp: true };
      }
      if (!this.totp.verify(totpToken, user.totpSecret)) {
        throw new UnauthorizedException('Invalid authenticator code');
      }
    }
    return this.issueToken(user);
  }

  async setup2fa(userId: string): Promise<{ qrDataUrl: string; secret: string }> {
    const user = await this.users.findById(userId);
    const { secret, otpAuthUrl } = this.totp.generateSecret(user.email);
    await this.users.setTotpSecret(userId, secret);
    const qrDataUrl = await this.totp.generateQrDataUrl(otpAuthUrl);
    return { qrDataUrl, secret };
  }

  async enable2fa(userId: string, token: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user.totpSecret) throw new BadRequestException('Run setup first');
    if (!this.totp.verify(token, user.totpSecret)) {
      throw new UnauthorizedException('Invalid authenticator code');
    }
    await this.users.enableTotp(userId);
  }

  async disable2fa(userId: string, token: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user.totpEnabled) throw new BadRequestException('2FA is not enabled');
    if (!this.totp.verify(token, user.totpSecret)) {
      throw new UnauthorizedException('Invalid authenticator code');
    }
    await this.users.disableTotp(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!(await this.users.validatePassword(user, currentPassword))) {
      throw new BadRequestException('Current password is incorrect');
    }
    const hash = await this.users.hashPassword(newPassword);
    await this.users.updatePassword(userId, hash);
  }

  async getUser(userId: string) {
    const user = await this.users.findById(userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      storageUsedBytes: Number(user.storageUsedBytes),
      storageQuotaBytes: Number(user.storageQuotaBytes),
      totpEnabled: user.totpEnabled,
    };
  }

  async forgotPassword(email: string): Promise<{ resetUrl: string }> {
    const user = await this.users.findByEmail(email).catch(() => null);
    // Always return success to avoid user enumeration
    if (!user) return { resetUrl: '' };

    const token  = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.users.setResetToken(user.id, token, expiry);

    const appUrl = this.cfg.get('APP_URL', `http://${this.cfg.get('HOST', 'localhost')}:8080`);
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    if (this.email.isConfigured) {
      await this.email.sendPasswordReset(user.email, resetUrl, user.name ?? '');
      return { resetUrl: '' }; // don't expose link when email is sent
    }

    // No SMTP — return URL so admin/user can copy it
    return { resetUrl };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.users.findByResetToken(token);
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }
    const hash = await this.users.hashPassword(newPassword);
    await this.users.updatePassword(user.id, hash);
    await this.users.clearResetToken(user.id);
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.users.deleteAccount(userId);
  }

  private issueToken(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        storageUsedBytes: Number(user.storageUsedBytes),
        storageQuotaBytes: Number(user.storageQuotaBytes),
        totpEnabled: user.totpEnabled,
      },
    };
  }
}
