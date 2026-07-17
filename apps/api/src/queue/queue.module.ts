import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const NOTIFICATION_QUEUE = 'notification';
export const MEMBERSHIP_QUEUE = 'membership';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: NOTIFICATION_QUEUE },
      { name: MEMBERSHIP_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
