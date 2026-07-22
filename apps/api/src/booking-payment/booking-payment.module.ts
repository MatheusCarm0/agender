import { Module } from '@nestjs/common';
import { BookingPaymentService } from './booking-payment.service';
import { NotificationModule } from '../notification/notification.module';
import { AvailabilityModule } from '../availability/availability.module';

// ScheduleModule.forRoot() já é chamado no PlanModule; um único forRoot cobre
// os @Cron de todos os providers da app, então não repetimos aqui.
@Module({
  imports: [NotificationModule, AvailabilityModule],
  providers: [BookingPaymentService],
  exports: [BookingPaymentService],
})
export class BookingPaymentModule {}
