import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  CreateCardPaymentParams,
  CreatePixPaymentParams,
  CreateSubscriptionParams,
  OAuthTokenResult,
  PaymentChargeStatus,
  PaymentProvider,
  PaymentResult,
  SellerBalance,
  SubscriptionResult,
  SubscriptionStatus,
} from './payment-provider.interface';

const MP_BASE_URL = 'https://api.mercadopago.com';
const MP_AUTH_URL = 'https://auth.mercadopago.com.br/authorization';

/**
 * Implementação concreta do Mercado Pago (checkout transparente + preapproval +
 * marketplace/OAuth).
 *
 * Split (marketplace): quando os params trazem `seller`, a cobrança do
 * agendamento é criada com o ACCESS TOKEN do lojista (o dinheiro cai direto na
 * conta MP dele) e a plataforma retém `applicationFee`. Sem `seller`, cai no
 * modo conta única (collector = plataforma), usado só pela assinatura de plano
 * e no legado/sandbox. Ver docs/pagamentos.md.
 */
@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  readonly name = 'mercadopago';
  private readonly logger = new Logger(MercadoPagoProvider.name);
  private readonly accessToken: string | undefined;
  private readonly webhookSecret: string | undefined;
  private readonly appId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    this.webhookSecret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    this.appId = this.config.get<string>('MERCADOPAGO_APP_ID');
    this.clientSecret = this.config.get<string>('MERCADOPAGO_CLIENT_SECRET');
    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (!this.accessToken) {
      this.logger.warn(
        'MERCADOPAGO_ACCESS_TOKEN não configurado — cobranças vão falhar até ser definido.',
      );
    }
  }

  // -------------------------------------------------------------------------
  // HTTP helper. `accessToken` opcional sobrepõe o token da plataforma — usado
  // para agir EM NOME do lojista (split/saldo) com o token OAuth dele.
  // -------------------------------------------------------------------------
  private async mpFetch<T = any>(
    path: string,
    init: RequestInit & { idempotencyKey?: string; accessToken?: string } = {},
  ): Promise<T> {
    const token = init.accessToken ?? this.accessToken;
    if (!token) {
      throw new ServiceUnavailableException(
        'Gateway de pagamento não configurado.',
      );
    }

    const { idempotencyKey, accessToken: _at, headers, ...rest } = init;
    const res = await fetch(`${MP_BASE_URL}${path}`, {
      ...rest,
      headers: {
        Authorization: `Bearer ${token}`,
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

      // Caso conhecido e ACIONÁVEL: a conta do lojista (collector) não tem chave
      // PIX cadastrada, então o MP não gera o QR (cause 13253 / "key enabled for
      // QR"). Sem isso o cliente veria só "falha no gateway" e o lojista não
      // saberia o motivo. Devolvemos 400 com mensagem clara → o cliente cai pro
      // cartão e o lojista entende que precisa cadastrar a chave PIX no MP.
      const causes = Array.isArray(body?.cause) ? body.cause : [];
      const isPixKeyMissing =
        causes.some((c: any) => Number(c?.code) === 13253) ||
        String(body?.message ?? '').toLowerCase().includes('key enabled for qr');
      if (isPixKeyMissing) {
        throw new BadRequestException({
          code: 'PIX_KEY_REQUIRED',
          message:
            'Este estabelecimento ainda não habilitou o recebimento por PIX. Tente pagar com cartão.',
        });
      }

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
      // Split: cobra com o token do lojista quando presente.
      accessToken: params.seller?.accessToken,
      body: JSON.stringify({
        transaction_amount: Number(params.amount.toFixed(2)),
        description: params.description,
        payment_method_id: 'pix',
        external_reference: params.externalReference,
        // O MP rejeita notification_url http/localhost — só envia se existir.
        ...(params.notificationUrl
          ? { notification_url: params.notificationUrl }
          : {}),
        // Comissão da plataforma (marketplace). Só envia se > 0.
        ...(params.applicationFee && params.applicationFee > 0
          ? { application_fee: Number(params.applicationFee.toFixed(2)) }
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
      accessToken: params.seller?.accessToken,
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
        ...(params.applicationFee && params.applicationFee > 0
          ? { application_fee: Number(params.applicationFee.toFixed(2)) }
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

  async getPayment(
    chargeId: string,
    sellerAccessToken?: string | null,
  ): Promise<PaymentResult> {
    const body = await this.mpFetch(`/v1/payments/${chargeId}`, {
      method: 'GET',
      accessToken: sellerAccessToken ?? undefined,
    });
    return this.toPaymentResult(body);
  }

  async refundPayment(
    chargeId: string,
    sellerAccessToken?: string | null,
  ): Promise<void> {
    await this.mpFetch(`/v1/payments/${chargeId}/refunds`, {
      method: 'POST',
      idempotencyKey: `refund-${chargeId}`,
      accessToken: sellerAccessToken ?? undefined,
      body: JSON.stringify({}),
    });
  }

  // -------------------------------------------------------------------------
  // Assinatura de plano (preapproval) — sempre na conta da plataforma.
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
          frequency: params.frequencyMonths ?? 1,
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
  // OAuth / marketplace (Mercado Pago Connect)
  // -------------------------------------------------------------------------
  buildAuthorizationUrl(input: { state: string; redirectUri: string }): string {
    if (!this.appId) {
      throw new ServiceUnavailableException(
        'Integração de marketplace não configurada (MERCADOPAGO_APP_ID ausente).',
      );
    }
    const qs = new URLSearchParams({
      client_id: this.appId,
      response_type: 'code',
      platform_id: 'mp',
      state: input.state,
      redirect_uri: input.redirectUri,
    });
    return `${MP_AUTH_URL}?${qs.toString()}`;
  }

  async exchangeOAuthCode(input: {
    code: string;
    redirectUri: string;
  }): Promise<OAuthTokenResult> {
    return this.oauthToken({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: input.redirectUri,
    });
  }

  async refreshOAuthToken(refreshToken: string): Promise<OAuthTokenResult> {
    return this.oauthToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  /** POST /oauth/token — autenticado por client_id + client_secret. */
  private async oauthToken(
    extra: Record<string, string>,
  ): Promise<OAuthTokenResult> {
    if (!this.appId || !this.clientSecret) {
      throw new ServiceUnavailableException(
        'Integração de marketplace não configurada (MERCADOPAGO_APP_ID/CLIENT_SECRET ausentes).',
      );
    }
    const res = await fetch(`${MP_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: this.appId,
        client_secret: this.clientSecret,
        ...extra,
      }),
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};
    if (!res.ok) {
      // Não vazar client_secret/detalhes crus.
      this.logger.error(
        `Mercado Pago /oauth/token -> ${res.status}: ${JSON.stringify(body)}`,
      );
      throw new ServiceUnavailableException(
        'Falha ao conectar a conta Mercado Pago.',
      );
    }
    return {
      userId: String(body.user_id),
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      publicKey: body.public_key,
      expiresIn: Number(body.expires_in ?? 0),
    };
  }

  async getSellerBalance(accessToken: string): Promise<SellerBalance> {
    // Saldo da conta MP do lojista. Campos podem variar conforme a conta;
    // tratamos defensivamente e caímos em 0 quando ausentes.
    const body = await this.mpFetch<any>('/users/me/mercadopago_account/balance', {
      method: 'GET',
      accessToken,
    });
    const available = Number(
      body?.available_balance ?? body?.total_available_balance ?? 0,
    );
    const pending = Number(
      body?.unavailable_balance ?? body?.total_unavailable_balance ?? 0,
    );
    return {
      available: Number.isFinite(available) ? available : 0,
      pending: Number.isFinite(pending) ? pending : 0,
      currency: body?.currency_id ?? 'BRL',
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
