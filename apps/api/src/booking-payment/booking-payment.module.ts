import { Module } from '@nestjs/common';
import { BookingPaymentService } from './booking-payment.service';
import { NotificationModule } from '../notification/notification.module';
import { AvailabilityModule } from '../availability/availability.module';

// ScheduleModule.forRoot() é registrado uma única vez no AppModule, apenas no
// processo worker (ver common/process-role.ts). O @Cron de BookingPaymentService
// fica inerte na API e só dispara no worker.
@Module({
  imports: [NotificationModule, AvailabilityModule],
  providers: [BookingPaymentService],
  exports: [BookingPaymentService],
})
export class BookingPaymentModule {}
