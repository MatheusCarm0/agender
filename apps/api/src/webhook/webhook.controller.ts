import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';

// Endpoint público (sem JWT) — o gateway chama sem token. A segurança vem da
// verificação de assinatura dentro do service, não de guard de auth.
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  // Validação/health: o painel do MP (e verificadores de URL) às vezes fazem um
  // GET para checar se a URL existe antes de salvar. Respondemos 200 — sem GET
  // aqui a URL retorna 404 e o painel a considera inválida. Nenhum efeito: as
  // notificações reais chegam por POST.
  @Get('mercadopago')
  @HttpCode(200)
  mercadopagoHealth() {
    return { ok: true };
  }

  @Post('mercadopago')
  @HttpCode(200)
  async mercadopago(
    @Body() body: any,
    @Query() query: Record<string, any>,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.webhookService.handleMercadoPago({
      body,
      query,
      signatureHeader: signature,
      requestId,
    });
  }
}
