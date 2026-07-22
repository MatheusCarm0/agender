import { Module } from '@nestjs/common';
import { PaymentAccountController } from './payment-account.controller';
import { PaymentAccountService } from './payment-account.service';

@Module({
  controllers: [PaymentAccountController],
  providers: [PaymentAccountService],
  exports: [PaymentAccountService],
})
export class PaymentAccountModule {}
