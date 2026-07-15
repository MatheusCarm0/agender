import { Module } from '@nestjs/common';
import { ScheduleBlockController } from './schedule-block.controller';
import { ScheduleBlockService } from './schedule-block.service';

@Module({
  controllers: [ScheduleBlockController],
  providers: [ScheduleBlockService],
  exports: [ScheduleBlockService],
})
export class ScheduleBlockModule {}
