import {
  Body,
  Controller,
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
