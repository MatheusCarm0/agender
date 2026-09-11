import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationController } from './notification.controller';
import { SmsService } from './sms/sms.service';
import { IS_WORKER } from '../common/process-role';

// O NotificationProcessor (consumidor da fila BullMQ) só é registrado no
// processo worker. Na API ficam apenas o produtor (NotificationService) e o
// controller — a API enfileira, o worker consome.
@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    SmsService,
    ...(IS_WORKER ? [NotificationProcessor] : []),
  ],
  exports: [NotificationService, SmsService],
})
export class NotificationModule {}
