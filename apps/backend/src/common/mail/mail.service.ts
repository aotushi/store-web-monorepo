import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';

// 邮件发送：配置了 MAIL_HOST 走真实 SMTP；未配置（本地开发）降级 jsonTransport 假发送不出网。
// 邮件正文可能含验证码等敏感内容，任何模式下都不落日志（PLAN §6.5）
@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly realSmtp: boolean;
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(config: ConfigService) {
    const host = config.get<string>('MAIL_HOST');
    const port = config.get<number>('MAIL_PORT')!;
    const user = config.get<string>('MAIL_USER');
    this.realSmtp = !!host;
    this.from = config.get<string>('MAIL_FROM') || user || 'store-web <noreply@store-web.local>';
    this.transporter = this.realSmtp
      ? createTransport({
          host,
          port,
          secure: port === 465,
          auth: user ? { user, pass: config.get<string>('MAIL_PASS') } : undefined,
        })
      : createTransport({ jsonTransport: true });
    if (!this.realSmtp) {
      this.logger.warn('未配置 MAIL_HOST，邮件走 jsonTransport 模拟发送（仅本地开发）');
    }
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({ from: this.from, to, subject, html });
    this.logger.log(`邮件已${this.realSmtp ? '发送' : '模拟发送'}: to=${to} subject=${subject}`);
  }
}
