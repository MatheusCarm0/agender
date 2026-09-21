// Abstração de gateway de pagamento (ver docs/pagamentos.md).
// O restante do sistema depende SÓ desta interface — nunca do Mercado Pago
// direto. Trocar de gateway (ou plugar split/marketplace real) = nova
// implementação desta interface, sem tocar na lógica de negócio.

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

/** Status normalizado de uma cobrança, independente do gateway. */
export type PaymentChargeStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'refunded'
  | 'expired';

/** Status normalizado de uma assinatura, independente do gateway. */
export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'overdue'
  | 'cancelled';

export interface PayerInfo {
  email: string;
  firstName?: string;
  lastName?: string;
  document?: { type: 'CPF' | 'CNPJ'; number: string };
}

/**
 * Credenciais do lojista no modelo marketplace (Mercado Pago Connect). Quando
 * presentes, a cobrança do agendamento é criada EM NOME do lojista (o dinheiro
 * cai direto na conta MP dele) e a plataforma retém `applicationFee`. Ausentes
 * = modo conta única (legado/sandbox), collector = plataforma.
 */
export interface SellerCredentials {
  accessToken: string;
  userId?: string;
}

export interface CreatePixPaymentParams {
  amount: number; // em BRL (reais)
  description: string;
  payer: PayerInfo;
  externalReference: string; // id do agendamento (correlação no webhook)
  idempotencyKey: string; // chave única POR TENTATIVA (não reusar entre retries)
  notificationUrl?: string;
  expiresInMinutes?: number;
  /** Conta do recebedor (split/marketplace). Vazio no modo conta única. */
  seller?: SellerCredentials | null;
  /** Comissão da plataforma em BRL (application_fee do MP). 0/omitido = sem comissão. */
  applicationFee?: number;
}

export interface CreateCardPaymentParams {
  amount: number;
  description: string;
  payer: PayerInfo;
  cardToken: string; // gerado no frontend (checkout transparente)
  installments: number;
  paymentMethodId: string; // ex.: 'visa', 'master'
  externalReference: string;
  idempotencyKey: string; // chave única POR TENTATIVA
  notificationUrl?: string;
  seller?: SellerCredentials | null;
  applicationFee?: number;
}

export interface PaymentResult {
  chargeId: string;
  status: PaymentChargeStatus;
  rawStatus: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  checkoutUrl?: string;
  expiresAt?: Date;
  paidAt?: Date;
}

export interface CreateSubscriptionParams {
  amount: number;
  reason: string;
  payer: PayerInfo;
  externalReference: string; // businessId
  /** Omitido quando a URL pública não é https (o MP rejeita http/localhost). */
  backUrl?: string;
  notificationUrl?: string;
}

export interface SubscriptionResult {
  subscriptionId: string;
  status: SubscriptionStatus;
  rawStatus: string;
  checkoutUrl?: string;
  nextDueDate?: Date;
}

// --- OAuth / marketplace (Mercado Pago Connect) -----------------------------

export interface OAuthTokenResult {
  userId: string; // user_id do lojista no MP
  accessToken: string;
  refreshToken: string;
  publicKey?: string;
  /** Segundos até expirar (MP: ~180 dias). */
  expiresIn: number;
}

export interface SellerBalance {
  available: number;
  pending: number;
  currency: string;
}

export interface WebhookVerification {
  valid: boolean;
  /** id do recurso referenciado no evento (ex.: id do pagamento). */
  dataId?: string;
  /** tipo do evento (ex.: 'payment', 'subscription_preapproval'). */
  type?: string;
}

export interface PaymentProvider {
  readonly name: string;

  // --- Cobrança de agendamento ---
  createPixPayment(params: CreatePixPaymentParams): Promise<PaymentResult>;
  createCardPayment(params: CreateCardPaymentParams): Promise<PaymentResult>;
  /**
   * Consulta uma cobrança. `sellerAccessToken` é obrigatório para pagamentos
   * criados em nome do lojista (split) — a plataforma não os enxerga com o
   * próprio token.
   */
  getPayment(
    chargeId: string,
    sellerAccessToken?: string | null,
  ): Promise<PaymentResult>;
  refundPayment(chargeId: string, sellerAccessToken?: string | null): Promise<void>;

  // --- Assinatura de plano (conta da plataforma) ---
  createSubscription(
    params: CreateSubscriptionParams,
  ): Promise<SubscriptionResult>;
  getSubscription(subscriptionId: string): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;

  // --- OAuth / marketplace ---
  /** URL para o lojista autorizar a conexão da conta dele à plataforma. */
  buildAuthorizationUrl(input: { state: string; redirectUri: string }): string;
  /** Troca o `code` do callback por tokens do lojista. */
  exchangeOAuthCode(input: {
    code: string;
    redirectUri: string;
  }): Promise<OAuthTokenResult>;
  /** Renova o access token do lojista a partir do refresh token. */
  refreshOAuthToken(refreshToken: string): Promise<OAuthTokenResult>;
  /** Saldo real da conta MP do lojista (espelho exibido no painel). */
  getSellerBalance(accessToken: string): Promise<SellerBalance>;

  // --- Webhook ---
  verifyWebhookSignature(input: {
    signatureHeader?: string;
    requestId?: string;
    dataId: string;
  }): boolean;
}
