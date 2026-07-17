import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientAuthService } from './client-auth.service';
import { ClientAuthGuard } from './guards/client-auth.guard';
import { OptionalClientAuthGuard } from './guards/optional-client-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '30m' },
      }),
    }),
  ],
  providers: [ClientAuthService, ClientAuthGuard, OptionalClientAuthGuard],
  exports: [ClientAuthService, ClientAuthGuard, OptionalClientAuthGuard, JwtModule],
})
export class ClientAuthModule {}
