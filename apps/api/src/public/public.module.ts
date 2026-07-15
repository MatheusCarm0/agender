import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { AppointmentModule } from '../appointment/appointment.module';

@Module({
  imports: [AvailabilityModule, AppointmentModule],
  controllers: [PublicController],
})
export class PublicModule {}
