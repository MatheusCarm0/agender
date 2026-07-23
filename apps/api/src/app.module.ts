import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { TenantInterceptor } from './prisma/tenant.interceptor';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { ProfessionalModule } from './professional/professional.module';
import { ServiceModule } from './service/service.module';
import { WorkingHoursModule } from './working-hours/working-hours.module';
import { ScheduleBlockModule } from './schedule-block/schedule-block.module';
import { AppointmentModule } from './appointment/appointment.module';
import { AvailabilityModule } from './availability/availability.module';
import { PublicModule } from './public/public.module';
import { PublicV1Module } from './public-v1/public-v1.module';
import { HealthModule } from './health/health.module';
import { CustomizationModule } from './customization/customization.module';
import { RecurringBlockModule } from './recurring-block/recurring-block.module';
import { ReportModule } from './report/report.module';
import { ClientModule } from './client/client.module';
import { UploadModule } from './upload/upload.module';
import { NotificationModule } from './notification/notification.module';
import { ClientAuthModule } from './client-auth/client-auth.module';
import { CouponModule } from './coupon/coupon.module';
import { MembershipModule } from './membership/membership.module';
import { StaffModule } from './staff/staff.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PlanModule } from './plan/plan.module';
import { CampaignModule } from './campaign/campaign.module';
import { PaymentModule } from './payment/payment.module';
import { PaymentAccountModule } from './payment-account/payment-account.module';
import { PlanSubscriptionModule } from './plan-subscription/plan-subscription.module';
import { BookingPaymentModule } from './booking-payment/booking-payment.module';
import { WebhookModule } from './webhook/webhook.module';
import { FeedbackModule } from './feedback/feedback.module';

@Module({
  imports: [
    // envFilePath explícito para não depender do cwd: carrega o .env do app
    // (apps/api/.env) e cai para o .env da raiz do monorepo como fallback.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    RedisModule,
    QueueModule,
    AuthModule,
    BusinessModule,
    ProfessionalModule,
    ServiceModule,
    WorkingHoursModule,
    ScheduleBlockModule,
    AvailabilityModule,
    AppointmentModule,
    PublicModule,
    PublicV1Module,
    HealthModule,
    CustomizationModule,
    RecurringBlockModule,
    ReportModule,
    ClientModule,
    UploadModule,
    NotificationModule,
    ClientAuthModule,
    CouponModule,
    MembershipModule,
    StaffModule,
    OnboardingModule,
    PlanModule,
    CampaignModule,
    PaymentModule,
    PaymentAccountModule,
    PlanSubscriptionModule,
    BookingPaymentModule,
    WebhookModule,
    FeedbackModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
