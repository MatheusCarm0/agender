import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
  SellerCredentials,
} from '../payment/payment-provider.interface';
import { encryptSecret, decryptSecret } from '../common/token-crypto';
import { estimateFee } from '../payment/fees';

// Antecedência para renovar o token do lojista antes de expirar (MP: ~180 dias).
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000; // 1 dia
const STATE_TTL_MS = 15 * 60 * 1000; // 15 min
// Página do MP onde o lojista saca o próprio saldo (modelo espelho + link).
const MP_WITHDRAW_URL = 'https://www.mercadopago.com.br/balance';

/**
 * Conta de recebimento no modelo MARKETPLACE (Mercado Pago Connect / OAuth).
 * O lojista conecta a própria conta MP; a partir daí o pagamento do agendamento
 * cai direto na conta dele (ver booking-payment) e o saldo exibido aqui é o
 * saldo REAL do MP do lojista. A plataforma nunca custodia o dinheiro; o saque
 * é feito dentro do MP (botão que leva ao painel deles). Ver docs/pagamentos.md.
 */
@Injectable()
export class PaymentAccountService {
  private readonly logger = new Logger(PaymentAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  // -------------------------------------------------------------------------
  // Leitura: status da conexão + saldo real espelhado do MP.
  // -------------------------------------------------------------------------
  async get(businessId: string) {
    const account = await this.prisma.raw.paymentAccount.findUnique({
      where: { businessId },
    });

    const connected = this.isConnected(account);
    // Saldo GLOBAL do MP: a API de saldo (/users/me/mercadopago_account/balance)
    // NÃO é liberada para o token de marketplace (403). O saldo real do MP o
    // lojista vê dentro do MP (link). Em vez disso mostramos o EXTRATO PRÓPRIO:
    // o que ele recebeu através dos agendamentos, calculado dos nossos registros
    // (BookingPayment) — não depende de nenhuma API bloqueada.
    const received = await this.computeReceived(businessId);
    const recentPayments = await this.recentPayments(businessId);

    return {
      connected,
      account: account
        ? {
            status: account.status,
            provider: account.provider,
            externalAccountId: account.externalAccountId, // user_id do MP (não é segredo)
            connectedAt: account.connectedAt,
            pixUnavailable: account.pixUnavailable,
          }
        : null,
      received,
      recentPayments,
      withdrawUrl: connected ? MP_WITHDRAW_URL : null,
    };
  }

  /**
   * Extrato próprio: soma dos pagamentos de agendamento CONFIRMADOS deste negócio
   * (bruto, taxa estimada do gateway, líquido). É o que entrou pela plataforma —
   * fonte da verdade são os nossos registros, já que todo pagamento passa por nós.
   * Não é o saldo global do MP (esse fica no painel do MP).
   */
  private async computeReceived(businessId: string) {
    const payments = await this.prisma.raw.bookingPayment.findMany({
      where: { businessId, status: 'confirmed' },
      select: { amount: true, method: true },
    });
    let gross = 0;
    let fees = 0;
    for (const p of payments) {
      const amount = Number(p.amount);
      gross += amount;
      fees += estimateFee(amount, p.method);
    }
    return {
      gross: round2(gross),
      estimatedFees: round2(fees),
      net: round2(gross - fees),
      count: payments.length,
      currency: 'BRL',
    };
  }

  /** Últimos pagamentos confirmados, para o extrato exibido no painel. */
  private async recentPayments(businessId: string) {
    const payments = await this.prisma.raw.bookingPayment.findMany({
      where: { businessId, status: 'confirmed' },
      orderBy: { paidAt: 'desc' },
      take: 10,
      select: { id: true, amount: true, method: true, paidAt: true },
    });
    return payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      paidAt: p.paidAt,
    }));
  }

  // -------------------------------------------------------------------------
  // OAuth: início da conexão.
  // -------------------------------------------------------------------------
  getConnectUrl(businessId: string) {
    const redirectUri = this.redirectUri();
    const state = this.signState(businessId);
    const authorizationUrl = this.provider.buildAuthorizationUrl({
      state,
      redirectUri,
    });
    return { authorizationUrl };
  }

  // -------------------------------------------------------------------------
  // OAuth: retorno do MP. `state` é a prova de vínculo (não há JWT no redirect).
  // Retorna a URL do painel para onde redirecionar o navegador do dono.
  // -------------------------------------------------------------------------
  async handleOAuthCallback(input: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<{ redirectTo: string }> {
    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:3000');
    const base = `${webUrl}/admin/recebimento`;

    if (input.error) {
      this.logger.warn(`OAuth do MP retornou erro: ${input.error}`);
      return { redirectTo: `${base}?connect=denied` };
    }
    const businessId = input.state ? this.verifyState(input.state) : null;
    if (!businessId || !input.code) {
      return { redirectTo: `${base}?connect=invalid` };
    }

    try {
      const tokens = await this.provider.exchangeOAuthCode({
        code: input.code,
        redirectUri: this.redirectUri(),
      });
      await this.persistTokens(businessId, tokens);
      return { redirectTo: `${base}?connected=1` };
    } catch (e: any) {
      this.logger.error(
        `Falha ao concluir conexão do MP para ${businessId}: ${e.message}`,
      );
      return { redirectTo: `${base}?connect=error` };
    }
  }

  async disconnect(businessId: string) {
    const account = await this.prisma.raw.paymentAccount.findUnique({
      where: { businessId },
    });
    if (!account) {
      throw new NotFoundException('Conta de recebimento não configurada.');
    }
    await this.prisma.raw.paymentAccount.update({
      where: { businessId },
      data: {
        status: 'pending_verification',
        externalAccountId: null,
        oauthAccessToken: null,
        oauthRefreshToken: null,
        oauthPublicKey: null,
        tokenExpiresAt: null,
        connectedAt: null,
        pixUnavailable: false,
      },
    });
    return this.get(businessId);
  }

  // -------------------------------------------------------------------------
  // Credenciais do lojista para o SPLIT (usado por booking-payment). Renova o
  // token se estiver perto de expirar. Retorna null se a conta não está
  // conectada — o chamador deve bloquear a cobrança com mensagem clara.
  // -------------------------------------------------------------------------
  async getSellerCredentials(
    businessId: string,
  ): Promise<SellerCredentials | null> {
    const account = await this.prisma.raw.paymentAccount.findUnique({
      where: { businessId },
    });
    if (!this.isConnected(account)) return null;
    const accessToken = await this.resolveAccessToken(account!);
    return { accessToken, userId: account!.externalAccountId ?? undefined };
  }

  // -------------------------------------------------------------------------
  // Internos
  // -------------------------------------------------------------------------
  private isConnected(account: {
    status: string;
    oauthAccessToken: string | null;
  } | null): account is { status: string; oauthAccessToken: string } & any {
    return (
      !!account &&
      account.status === 'active' &&
      !!account.oauthAccessToken
    );
  }

  /** Decifra o access token, renovando (e persistindo) se estiver expirando. */
  private async resolveAccessToken(account: {
    businessId: string;
    oauthAccessToken: string | null;
    oauthRefreshToken: string | null;
    tokenExpiresAt: Date | null;
  }): Promise<string> {
    const expiring =
      !account.tokenExpiresAt ||
      account.tokenExpiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS;

    if (expiring && account.oauthRefreshToken) {
      try {
        const refreshed = await this.provider.refreshOAuthToken(
          decryptSecret(account.oauthRefreshToken),
        );
        await this.persistTokens(account.businessId, refreshed);
        return refreshed.accessToken;
      } catch (e: any) {
        this.logger.warn(
          `Falha ao renovar token do MP para ${account.businessId}: ${e.message}. Usando token atual.`,
        );
      }
    }
    return decryptSecret(account.oauthAccessToken!);
  }

  private async persistTokens(
    businessId: string,
    tokens: {
      userId: string;
      accessToken: string;
      refreshToken: string;
      publicKey?: string;
      expiresIn: number;
    },
  ) {
    const expiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : null;
    await this.prisma.raw.paymentAccount.upsert({
      where: { businessId },
      create: {
        businessId,
        provider: this.provider.name,
        status: 'active',
        externalAccountId: tokens.userId,
        oauthAccessToken: encryptSecret(tokens.accessToken),
        oauthRefreshToken: encryptSecret(tokens.refreshToken),
        oauthPublicKey: tokens.publicKey,
        tokenExpiresAt: expiresAt,
        connectedAt: new Date(),
        pixUnavailable: false,
      },
      update: {
        status: 'active',
        externalAccountId: tokens.userId,
        oauthAccessToken: encryptSecret(tokens.accessToken),
        oauthRefreshToken: encryptSecret(tokens.refreshToken),
        oauthPublicKey: tokens.publicKey,
        tokenExpiresAt: expiresAt,
        connectedAt: new Date(),
        // Reconectou: dá ao PIX uma nova chance (a conta pode ter cadastrado chave).
        pixUnavailable: false,
      },
    });
  }

  /**
   * PIX reativo: o MP não deixa checar antes se o vendedor tem chave PIX. Quando
   * uma cobrança PIX falha por falta de chave (booking-payment captura o erro),
   * marcamos aqui — o checkout esconde o PIX e o painel avisa o dono. Best-effort:
   * nunca deixa a falha de marcação derrubar o fluxo de pagamento.
   */
  async markPixUnavailable(businessId: string) {
    try {
      await this.prisma.raw.paymentAccount.updateMany({
        where: { businessId },
        data: { pixUnavailable: true },
      });
    } catch (e: any) {
      this.logger.warn(
        `Não foi possível marcar PIX indisponível para ${businessId}: ${e.message}`,
      );
    }
  }

  /** O dono diz que cadastrou a chave PIX: reabilita o PIX para novo teste. */
  async clearPixUnavailable(businessId: string) {
    await this.prisma.raw.paymentAccount.updateMany({
      where: { businessId },
      data: { pixUnavailable: false },
    });
    return this.get(businessId);
  }

  private redirectUri(): string {
    const explicit = this.config.get<string>('MERCADOPAGO_OAUTH_REDIRECT_URI');
    if (explicit) return explicit;
    const apiUrl = this.config.get<string>('APP_URL', 'http://localhost:3001');
    return `${apiUrl}/payment-account/oauth/callback`;
  }

  // State assinado (HMAC) para o OAuth: {businessId, nonce, exp}. Impede que um
  // terceiro conecte a conta MP dele a um businessId que não é seu.
  private stateSecret(): string {
    return (
      this.config.get<string>('TOKEN_ENCRYPTION_KEY') ??
      this.config.get<string>('JWT_SECRET') ??
      'dev-state-secret'
    );
  }

  private signState(businessId: string): string {
    const payload = {
      b: businessId,
      n: randomBytes(8).toString('hex'),
      e: Date.now() + STATE_TTL_MS,
    };
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.stateSecret())
      .update(data)
      .digest('base64url');
    return `${data}.${sig}`;
  }

  private verifyState(state: string): string | null {
    const [data, sig] = state.split('.');
    if (!data || !sig) return null;
    const expected = createHmac('sha256', this.stateSecret())
      .update(data)
      .digest('base64url');
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    } catch {
      return null;
    }
    try {
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
      if (typeof payload.e !== 'number' || payload.e < Date.now()) return null;
      return typeof payload.b === 'string' ? payload.b : null;
    } catch {
      return null;
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
