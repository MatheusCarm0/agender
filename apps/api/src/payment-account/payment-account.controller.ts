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
import { PlanGuard } from '../auth/guards/plan.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequiresPlan } from '../auth/decorators/requires-plan.decorator';
import { PLANS_WITH } from '../plan/plan-limits';
import { PaymentAccountService } from './payment-account.service';
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import { WithdrawDto } from './dto/withdraw.dto';

// Conta de recebimento e saque são exclusivos do dono. Pagamento pela
// plataforma é Profissional/Pro (plan/plan-limits.ts): gate nas MUTAÇÕES;
// leitura de saldo/histórico segue livre após downgrade.
@Controller('payment-account')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
export class PaymentAccountController {
  constructor(private readonly service: PaymentAccountService) {}

  @Get()
  @Roles('owner')
  async get(@Req() req: any) {
    return this.service.get(req.user.businessId);
  }

  @Post()
  @Roles('owner')
  @RequiresPlan(...PLANS_WITH.onlinePayments)
  async createOrUpdate(@Req() req: any, @Body() dto: CreatePaymentAccountDto) {
    return this.service.createOrUpdate(req.user.businessId, dto);
  }

  // Simula conclusão de KYC para destravar o teste do saque (ver service).
  @Post('verify')
  @Roles('owner')
  @RequiresPlan(...PLANS_WITH.onlinePayments)
  async verify(@Req() req: any) {
    return this.service.markVerified(req.user.businessId);
  }

  @Post('withdraw')
  @Roles('owner')
  @RequiresPlan(...PLANS_WITH.onlinePayments)
  async withdraw(@Req() req: any, @Body() dto: WithdrawDto) {
    return this.service.withdraw(req.user.businessId, dto.amount);
  }

  @Get('withdrawals')
  @Roles('owner')
  async withdrawals(@Req() req: any) {
    return this.service.listWithdrawals(req.user.businessId);
  }
}
