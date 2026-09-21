import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PlanGuard } from '../auth/guards/plan.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequiresPlan } from '../auth/decorators/requires-plan.decorator';
import { PLANS_WITH } from '../plan/plan-limits';
import { PaymentAccountService } from './payment-account.service';

// Conta de recebimento é exclusiva do dono. Conectar a conta MP (marketplace)
// é Profissional/Pro (plan/plan-limits.ts): gate nas MUTAÇÕES; leitura de
// status/saldo segue livre após downgrade. O callback do OAuth é público e
// vive em payment-oauth.controller.ts (o MP redireciona sem JWT).
@Controller('payment-account')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
export class PaymentAccountController {
  constructor(private readonly service: PaymentAccountService) {}

  @Get()
  @Roles('owner')
  async get(@Req() req: any) {
    return this.service.get(req.user.businessId);
  }

  /** Inicia a conexão da conta MP do lojista: devolve a URL de autorização. */
  @Get('connect')
  @Roles('owner')
  @RequiresPlan(...PLANS_WITH.onlinePayments)
  async connect(@Req() req: any) {
    return this.service.getConnectUrl(req.user.businessId);
  }

  @Post('disconnect')
  @Roles('owner')
  async disconnect(@Req() req: any) {
    return this.service.disconnect(req.user.businessId);
  }

  /** Dono cadastrou a chave PIX no MP: reabilita o PIX no checkout. */
  @Post('pix/retry')
  @Roles('owner')
  async retryPix(@Req() req: any) {
    return this.service.clearPixUnavailable(req.user.businessId);
  }
}
