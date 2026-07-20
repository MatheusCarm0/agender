import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET')!,
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_TTL', '15m') as any,
        },
      }),
    }),
  ],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
