import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TotpService {
  generateSecret(email: string): { secret: string; otpAuthUrl: string } {
    const generated = speakeasy.generateSecret({
      name: `FileVault (${email})`,
      issuer: 'FileVault',
      length: 20,
    });
    return { secret: generated.base32, otpAuthUrl: generated.otpauth_url ?? '' };
  }

  async generateQrDataUrl(otpAuthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpAuthUrl);
  }

  verify(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }
}
