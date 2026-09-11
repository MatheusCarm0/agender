import { Module } from '@nestjs/common';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { NotificationModule } from '../notification/notification.module';

// ScheduleModule.forRoot() é registrado uma única vez no AppModule, apenas no
// processo worker. Os @Cron de PlanService ficam inertes na API.
@Module({
  imports: [NotificationModule],
  controllers: [PlanController],
  providers: [PlanService],
  exports: [PlanService],
})
export class PlanModule {}
