import { Module } from '@nestjs/common';
import { PublicV1Controller } from './public-v1.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { AppointmentModule } from '../appointment/appointment.module';
import { ClientAuthModule } from '../client-auth/client-auth.module';
import { CouponModule } from '../coupon/coupon.module';
import { MembershipModule } from '../membership/membership.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    AvailabilityModule,
    AppointmentModule,
    ClientAuthModule,
    CouponModule,
    MembershipModule,
    NotificationModule,
  ],
  controllers: [PublicV1Controller],
})
export class PublicV1Module {}
