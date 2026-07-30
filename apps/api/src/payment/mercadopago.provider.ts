import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  CreateCardPaymentParams,
  CreatePixPaymentParams,
  CreateSubscriptionParams,
  PaymentChargeStatus,
  PaymentProvider,
  PaymentResult,
  SubscriptionResult,
  SubscriptionStatus,
  WithdrawalParams,
  WithdrawalResult,
} from './payment-provider.interface';

const MP_BASE_URL = 'https://api.mercadopago.com';

/**
 * Implementação concreta do Mercado Pago (checkout transparente + preapproval).
 *
 * Modo atual: CONTA ÚNICA (collector = plataforma), adequado para sandbox e
 * validação de ponta a ponta. O split real (marketplace/subconta) entra pelo
 * campo `sellerAccountId` dos params — hoje ignorado; quando o marketplace via
 * OAuth for plugado, é aqui (header de conta / campos de split) que ele reside.
 * Ver docs/pagamentos.md e o checkpoint de produção.
 */
@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  readonly name = 'mercadopago';
  private readonly logger = new Logger(MercadoPagoProvider.name);
  private readonly accessToken: string | undefined;
  private readonly webhookSecret: string | undefined;
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    this.webhookSecret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (!this.accessToken) {
      this.logger.warn(
        'MERCADOPAGO_ACCESS_TOKEN não configurado — cobranças vão falhar até ser definido.',
      );
    }
  }

  // -------------------------------------------------------------------------
  // HTTP helper
  // -------------------------------------------------------------------------
  private async mpFetch<T = any>(
    path: string,
    init: RequestInit & { idempotencyKey?: string } = {},
  ): Promise<T> {
    if (!this.accessToken) {
      throw new ServiceUnavailableException(
        'Gateway de pagamento não configurado.',
      );
    }

    const { idempotencyKey, headers, ...rest } = init;
    const res = await fetch(`${MP_BASE_URL}${path}`, {
      ...rest,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
        ...(headers ?? {}),
      },
    });

    const text = await res.text();
    const body = text ? JSON.parse(text) : {};

    if (!res.ok) {
      // Nunca vazar credenciais/detalhes crus do gateway; logar internamente.
      this.logger.error(
        `Mercado Pago ${path} -> ${res.status}: ${JSON.stringify(body)}`,
      );
      throw new ServiceUnavailableException(
        'Falha ao comunicar com o gateway de pagamento.',
      );
    }

    return body as T;
  }

  // -------------------------------------------------------------------------
  // Normalização de status
  // -------------------------------------------------------------------------
  private mapPaymentStatus(raw: string): PaymentChargeStatus {
    switch (raw) {
      case 'approved':
        return 'confirmed';
      case 'refunded':
      case 'charged_back':
        return 'refunded';
      case 'cancelled':
      case 'rejected':
        return 'failed';
      case 'expired':
        return 'expired';
      default:
        // pending, in_process, authorized, in_mediation
        return 'pending';
    }
  }

  private mapSubscriptionStatus(raw: string): SubscriptionStatus {
    switch (raw) {
      case 'authorized':
        return 'active';
      case 'paused':
        return 'overdue';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  private toPaymentResult(body: any): PaymentResult {
    const txData = body?.point_of_interaction?.transaction_data;
    return {
      chargeId: String(body.id),
      status: this.mapPaymentStatus(body.status),
      rawStatus: body.status,
      pixQrCode: txData?.qr_code,
      pixQrCodeBase64: txData?.qr_code_base64,
      checkoutUrl: txData?.ticket_url,
      expiresAt: body.date_of_expiration
        ? new Date(body.date_of_expiration)
        : undefined,
      paidAt: body.date_approved ? new Date(body.date_approved) : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Cobrança de agendamento
  // -------------------------------------------------------------------------
  async createPixPayment(
    params: CreatePixPaymentParams,
  ): Promise<PaymentResult> {
    const expiration = params.expiresInMinutes ?? 30;
    const dateOfExpiration = new Date(
      Date.now() + expiration * 60 * 1000,
    ).toISOString();

    const body = await this.mpFetch('/v1/payments', {
      method: 'POST',
      idempotencyKey: params.idempotencyKey,
      body: JSON.stringify({
        transaction_amount: Number(params.amount.toFixed(2)),
        description: params.description,
        payment_method_id: 'pix',
        external_reference: params.externalReference,
        // O MP rejeita notification_url http/localhost — só envia se existir.
        ...(params.notificationUrl
          ? { notification_url: params.notificationUrl }
          : {}),
        date_of_expiration: dateOfExpiration,
        payer: {
          email: params.payer.email,
          first_name: params.payer.firstName,
          last_name: params.payer.lastName,
          ...(params.payer.document
            ? {
                identification: {
                  type: params.payer.document.type,
                  number: params.payer.document.number,
                },
              }
            : {}),
        },
      }),
    });

    return this.toPaymentResult(body);
  }

  async createCardPayment(
    params: CreateCardPaymentParams,
  ): Promise<PaymentResult> {
    const body = await this.mpFetch('/v1/payments', {
      method: 'POST',
      idempotencyKey: params.idempotencyKey,
      body: JSON.stringify({
        transaction_amount: Number(params.amount.toFixed(2)),
        description: params.description,
        token: params.cardToken,
        installments: params.installments,
        payment_method_id: params.paymentMethodId,
        external_reference: params.externalReference,
        ...(params.notificationUrl
          ? { notification_url: params.notificationUrl }
          : {}),
        payer: {
          email: params.payer.email,
          ...(params.payer.document
            ? {
                identification: {
                  type: params.payer.document.type,
                  number: params.payer.document.number,
                },
              }
            : {}),
        },
      }),
    });

    return this.toPaymentResult(body);
  }

  async getPayment(chargeId: string): Promise<PaymentResult> {
    const body = await this.mpFetch(`/v1/payments/${chargeId}`, {
      method: 'GET',
    });
    return this.toPaymentResult(body);
  }

  async refundPayment(chargeId: string): Promise<void> {
    await this.mpFetch(`/v1/payments/${chargeId}/refunds`, {
      method: 'POST',
      idempotencyKey: `refund-${chargeId}`,
      body: JSON.stringify({}),
    });
  }

  // -------------------------------------------------------------------------
  // Assinatura de plano (preapproval)
  // -------------------------------------------------------------------------
  async createSubscription(
    params: CreateSubscriptionParams,
  ): Promise<SubscriptionResult> {
    const body = await this.mpFetch('/preapproval', {
      method: 'POST',
      body: JSON.stringify({
        reason: params.reason,
        external_reference: params.externalReference,
        ...(params.backUrl ? { back_url: params.backUrl } : {}),
        payer_email: params.payer.email,
        status: 'pending',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: Number(params.amount.toFixed(2)),
          currency_id: 'BRL',
        },
      }),
    });

    return {
      subscriptionId: String(body.id),
      status: this.mapSubscriptionStatus(body.status),
      rawStatus: body.status,
      checkoutUrl: body.init_point,
      nextDueDate: body.next_payment_date
        ? new Date(body.next_payment_date)
        : undefined,
    };
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    const body = await this.mpFetch(`/preapproval/${subscriptionId}`, {
      method: 'GET',
    });
    return {
      subscriptionId: String(body.id),
      status: this.mapSubscriptionStatus(body.status),
      rawStatus: body.status,
      checkoutUrl: body.init_point,
      nextDueDate: body.next_payment_date
        ? new Date(body.next_payment_date)
        : undefined,
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.mpFetch(`/preapproval/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' }),
    });
  }

  // -------------------------------------------------------------------------
  // Saque
  // -------------------------------------------------------------------------
  async createWithdrawal(
    params: WithdrawalParams,
  ): Promise<WithdrawalResult> {
    // STUB CONSCIENTE: transferência/payout real depende do modelo de
    // marketplace/subconta (OAuth do dono) que ainda não está plugado. No modo
    // conta única de testes não há como sacar programaticamente para a conta do
    // dono. Registramos como 'pending' e sinalizamos claramente. Ver o
    // checkpoint de produção em docs/pagamentos.md.
    this.logger.warn(
      `Saque solicitado (R$ ${params.amount}) mas o payout real exige o modelo de marketplace/subconta ainda não plugado. Registrando como pendente.`,
    );
    return {
      status: 'pending',
      message:
        'Saque registrado. O repasse automático será habilitado quando a conta de recebimento (marketplace) estiver ativa.',
    };
  }

  // -------------------------------------------------------------------------
  // Webhook — verificação de assinatura (HMAC-SHA256)
  // Manifesto: id:<dataId>;request-id:<requestId>;ts:<ts>;
  // https://www.mercadopago.com/developers/pt/docs/your-integrations/notifications/webhooks
  // -------------------------------------------------------------------------
  verifyWebhookSignature(input: {
    signatureHeader?: string;
    requestId?: string;
    dataId: string;
  }): boolean {
    if (!this.webhookSecret) {
      // Sem segredo configurado não há como validar. Em produção FALHAMOS
      // FECHADO: sem o segredo, um webhook forjado poderia marcar cobranças como
      // pagas — então recusamos. Em dev/sandbox aceitamos com aviso para permitir
      // o teste de ponta a ponta.
      if (this.isProduction) {
        this.logger.error(
          'MERCADOPAGO_WEBHOOK_SECRET ausente em produção — webhook RECUSADO. Configure o segredo do gateway.',
        );
        return false;
      }
      this.logger.warn(
        'MERCADOPAGO_WEBHOOK_SECRET não configurado — webhook aceito sem verificação (apenas fora de produção).',
      );
      return true;
    }

    if (!input.signatureHeader) return false;

    // x-signature: "ts=1699999999,v1=abcdef..."
    const parts = input.signatureHeader.split(',').reduce<Record<string, string>>(
      (acc, part) => {
        const [k, v] = part.split('=');
        if (k && v) acc[k.trim()] = v.trim();
        return acc;
      },
      {},
    );

    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    const manifest = `id:${input.dataId};request-id:${input.requestId ?? ''};ts:${ts};`;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(manifest)
      .digest('hex');

    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(v1, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
