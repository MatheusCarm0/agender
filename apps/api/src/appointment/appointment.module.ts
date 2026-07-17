import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { AvailabilityModule } from '../availability/availability.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [AvailabilityModule, NotificationModule],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
