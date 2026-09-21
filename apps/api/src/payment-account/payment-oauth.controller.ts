import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentAccountService } from './payment-account.service';

/**
 * Callback público do OAuth do Mercado Pago. O MP redireciona o NAVEGADOR do
 * dono para cá após ele autorizar — sem JWT. A segurança do vínculo vem do
 * `state` assinado (HMAC) validado no service, não de guard de auth. Sempre
 * redireciona de volta ao painel (nunca devolve JSON cru para o navegador).
 */
@Controller('payment-account/oauth')
export class PaymentOAuthController {
  constructor(private readonly service: PaymentAccountService) {}

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const { redirectTo } = await this.service.handleOAuthCallback({
      code,
      state,
      error,
    });
    return res.redirect(redirectTo);
  }
}
