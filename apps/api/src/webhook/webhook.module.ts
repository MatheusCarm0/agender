import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { BookingPaymentModule } from '../booking-payment/booking-payment.module';
import { PlanSubscriptionModule } from '../plan-subscription/plan-subscription.module';

@Module({
  imports: [BookingPaymentModule, PlanSubscriptionModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
