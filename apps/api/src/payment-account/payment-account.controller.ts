import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaymentAccountService } from './payment-account.service';
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import { WithdrawDto } from './dto/withdraw.dto';

// Conta de recebimento e saque são exclusivos do dono.
@Controller('payment-account')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentAccountController {
  constructor(private readonly service: PaymentAccountService) {}

  @Get()
  @Roles('owner')
  async get(@Req() req: any) {
    return this.service.get(req.user.businessId);
  }

  @Post()
  @Roles('owner')
  async createOrUpdate(@Req() req: any, @Body() dto: CreatePaymentAccountDto) {
    return this.service.createOrUpdate(req.user.businessId, dto);
  }

  // Simula conclusão de KYC para destravar o teste do saque (ver service).
  @Post('verify')
  @Roles('owner')
  async verify(@Req() req: any) {
    return this.service.markVerified(req.user.businessId);
  }

  @Post('withdraw')
  @Roles('owner')
  async withdraw(@Req() req: any, @Body() dto: WithdrawDto) {
    return this.service.withdraw(req.user.businessId, dto.amount);
  }

  @Get('withdrawals')
  @Roles('owner')
  async withdrawals(@Req() req: any) {
    return this.service.listWithdrawals(req.user.businessId);
  }
}
