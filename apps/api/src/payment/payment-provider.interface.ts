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

export interface CreatePixPaymentParams {
  amount: number; // em BRL (reais)
  description: string;
  payer: PayerInfo;
  externalReference: string; // id do agendamento (correlação no webhook)
  idempotencyKey: string; // chave única POR TENTATIVA (não reusar entre retries)
  notificationUrl?: string;
  expiresInMinutes?: number;
  /**
   * Conta do recebedor (split/marketplace). Vazio no modo conta única de
   * testes; preenchido quando o marketplace/subconta real for plugado.
   */
  sellerAccountId?: string | null;
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
  sellerAccountId?: string | null;
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
  backUrl: string;
  notificationUrl?: string;
}

export interface SubscriptionResult {
  subscriptionId: string;
  status: SubscriptionStatus;
  rawStatus: string;
  checkoutUrl?: string;
  nextDueDate?: Date;
}

export interface WithdrawalParams {
  amount: number;
  pixKey?: string | null;
  externalReference: string; // businessId
  sellerAccountId?: string | null;
}

export interface WithdrawalResult {
  transferId?: string;
  status: 'pending' | 'confirmed' | 'failed';
  message?: string;
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
  getPayment(chargeId: string): Promise<PaymentResult>;
  refundPayment(chargeId: string): Promise<void>;

  // --- Assinatura de plano ---
  createSubscription(
    params: CreateSubscriptionParams,
  ): Promise<SubscriptionResult>;
  getSubscription(subscriptionId: string): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;

  // --- Saque (split/marketplace) ---
  createWithdrawal(params: WithdrawalParams): Promise<WithdrawalResult>;

  // --- Webhook ---
  verifyWebhookSignature(input: {
    signatureHeader?: string;
    requestId?: string;
    dataId: string;
  }): boolean;
}
