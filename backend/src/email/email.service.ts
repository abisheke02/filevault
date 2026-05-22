import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly cfg: ConfigService) {
    const host = cfg.get('SMTP_HOST');
    const user = cfg.get('SMTP_USER');
    const pass = cfg.get('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(cfg.get('SMTP_PORT', '587')),
        secure: cfg.get('SMTP_SECURE', 'false') === 'true',
        auth: { user, pass },
      });
      this.logger.log(`SMTP configured via ${host}`);
    } else {
      this.logger.warn('SMTP not configured — emails will be skipped (set SMTP_HOST, SMTP_USER, SMTP_PASS)');
    }
  }

  get isConfigured() {
    return this.transporter !== null;
  }

  async sendPasswordReset(to: string, resetUrl: string, name: string): Promise<void> {
    if (!this.transporter) return;

    const from = this.cfg.get('SMTP_FROM', `FileVault <${this.cfg.get('SMTP_USER')}>`);

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Reset your FileVault password',
      html: `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,system-ui,sans-serif;background:#0c0c10;color:#eeeef5;margin:0;padding:0;">
  <div style="max-width:480px;margin:40px auto;background:#13131a;border:1px solid #2a2a3e;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#7c6af7,#a78bfa);padding:28px 32px;">
      <h1 style="margin:0;font-size:22px;color:#fff;">FileVault</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Your private cloud storage</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 12px;font-size:18px;">Reset your password</h2>
      <p style="color:#9090b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Hi ${name || 'there'}, we received a request to reset the password for your FileVault account
        associated with <strong style="color:#eeeef5;">${to}</strong>.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#7c6af7,#9080ff);color:#fff;
                text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:15px;">
        Reset password
      </a>
      <p style="color:#50506a;font-size:12px;margin:20px 0 0;line-height:1.6;">
        This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can ignore this email.
      </p>
      <p style="color:#50506a;font-size:11px;margin:12px 0 0;word-break:break-all;">
        Or copy: ${resetUrl}
      </p>
    </div>
  </div>
</body>
</html>`,
    });

    this.logger.log(`Password reset email sent to ${to}`);
  }
}
