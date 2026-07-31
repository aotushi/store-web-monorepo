import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

// 非全局：目前只有 auth（验证码）消费，按需 imports
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
