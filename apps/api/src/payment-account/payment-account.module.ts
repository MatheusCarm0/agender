import { Module } from '@nestjs/common';
import { PaymentAccountController } from './payment-account.controller';
import { PaymentOAuthController } from './payment-oauth.controller';
import { PaymentAccountService } from './payment-account.service';

@Module({
  controllers: [PaymentAccountController, PaymentOAuthController],
  providers: [PaymentAccountService],
  exports: [PaymentAccountService],
})
export class PaymentAccountModule {}
