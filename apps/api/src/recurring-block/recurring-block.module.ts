import { Module } from '@nestjs/common';
import { RecurringBlockController } from './recurring-block.controller';
import { RecurringBlockService } from './recurring-block.service';

@Module({
  controllers: [RecurringBlockController],
  providers: [RecurringBlockService],
  exports: [RecurringBlockService],
})
export class RecurringBlockModule {}
