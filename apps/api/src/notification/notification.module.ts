import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationController } from './notification.controller';
import { SmsService } from './sms/sms.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationProcessor, SmsService],
  exports: [NotificationService, SmsService],
})
export class NotificationModule {}
