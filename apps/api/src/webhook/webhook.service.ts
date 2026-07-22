import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
} from '../payment/payment-provider.interface';
import { BookingPaymentService } from '../booking-payment/booking-payment.service';
import { PlanSubscriptionService } from '../plan-subscription/plan-subscription.service';

interface MpNotification {
  id?: string | number;
  type?: string;
  action?: string;
  data?: { id?: string | number };
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingPaymentService: BookingPaymentService,
    private readonly planSubscriptionService: PlanSubscriptionService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /**
   * Processa uma notificação do Mercado Pago.
   * 1) valida a assinatura; 2) garante idempotência (grava o evento antes de
   * aplicar efeito); 3) despacha para o serviço certo. Sempre responde 200 —
   * o gateway reentrega em erro, e a idempotência cobre a reentrega.
   */
  async handleMercadoPago(input: {
    body: MpNotification;
    query: Record<string, any>;
    signatureHeader?: string;
    requestId?: string;
  }): Promise<{ received: boolean }> {
    const { body, query } = input;

    const type = body?.type ?? query?.type ?? query?.topic;
    const dataId = String(
      body?.data?.id ?? query?.['data.id'] ?? query?.id ?? '',
    );

    if (!dataId) {
      this.logger.warn('Webhook sem data.id — ignorado.');
      return { received: true };
    }

    // 1) Verificação de assinatura. Sem assinatura válida, descartar.
    const valid = this.provider.verifyWebhookSignature({
      signatureHeader: input.signatureHeader,
      requestId: input.requestId,
      dataId,
    });
    if (!valid) {
      this.logger.warn(`Webhook com assinatura inválida (dataId=${dataId}).`);
      return { received: true }; // não vaza motivo; efeito nenhum aplicado
    }

    // 2) Idempotência: id do evento = id da notificação do gateway (único por
    // entrega no modo webhook). No fallback (IPN legado, sem `id` no corpo)
    // compomos com `action` para NÃO colapsar transições distintas do mesmo
    // recurso (ex.: 'payment.created' vs 'payment.updated'/approved) num único
    // id — senão a confirmação poderia ser descartada como "já processada".
    const action = body?.action ?? query?.action ?? '';
    const eventId = body?.id
      ? String(body.id)
      : `${type}:${dataId}:${action || Date.now()}`;
    try {
      await this.prisma.raw.webhookEvent.create({
        data: {
          provider: this.provider.name,
          eventId,
          type: String(type ?? 'unknown'),
          payload: (body ?? {}) as any,
        },
      });
    } catch (e: any) {
      // Violação de unique = reentrega já processada. Encerrar sem repetir efeito.
      if (e?.code === 'P2002') {
        this.logger.log(`Evento ${eventId} já processado — ignorado.`);
        return { received: true };
      }
      throw e;
    }

    // 3) Despacho por tipo.
    try {
      if (type === 'payment') {
        await this.bookingPaymentService.handleWebhookPayment(dataId);
      } else if (
        type === 'subscription_preapproval' ||
        type === 'preapproval'
      ) {
        await this.planSubscriptionService.handleWebhookStatus(dataId);
      } else {
        this.logger.log(`Webhook tipo '${type}' não tratado — ignorado.`);
      }
    } catch (e: any) {
      this.logger.error(
        `Falha ao processar webhook ${eventId} (${type}): ${e.message}`,
      );
      // Não relança: já gravamos o evento. Reprocessamento manual se preciso.
    }

    return { received: true };
  }
}
