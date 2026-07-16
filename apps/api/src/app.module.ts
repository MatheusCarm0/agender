import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
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
import { HealthModule } from './health/health.module';
import { CustomizationModule } from './customization/customization.module';
import { RecurringBlockModule } from './recurring-block/recurring-block.module';
import { ReportModule } from './report/report.module';
import { ClientModule } from './client/client.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    BusinessModule,
    ProfessionalModule,
    ServiceModule,
    WorkingHoursModule,
    ScheduleBlockModule,
    AvailabilityModule,
    AppointmentModule,
    PublicModule,
    HealthModule,
    CustomizationModule,
    RecurringBlockModule,
    ReportModule,
    ClientModule,
    UploadModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
