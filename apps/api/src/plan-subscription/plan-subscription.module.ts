import { Module } from '@nestjs/common';
import { PlanSubscriptionController } from './plan-subscription.controller';
import { PlanSubscriptionService } from './plan-subscription.service';

@Module({
  controllers: [PlanSubscriptionController],
  providers: [PlanSubscriptionService],
  exports: [PlanSubscriptionService],
})
export class PlanSubscriptionModule {}
