import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
} from '../payment/payment-provider.interface';
import { estimateFee } from '../payment/fees';
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto';

@Injectable()
export class PaymentAccountService {
  private readonly logger = new Logger(PaymentAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /**
   * Status da conta + saldo ESPELHADO. No modo conta única de testes o saldo é
   * um razão interno: soma dos pagamentos de agendamento confirmados menos os
   * saques. Exibimos bruto, taxa estimada e líquido — nunca só o bruto (ver
   * docs/pagamentos.md). Em produção com marketplace, a fonte da verdade do
   * saldo é o gateway, sincronizada por webhook.
   */
  async get(businessId: string) {
    const account = await this.prisma.raw.paymentAccount.findUnique({
      where: { businessId },
    });

    const balance = await this.computeBalance(businessId, this.prisma.raw);

    return {
      account: account
        ? {
            id: account.id,
            status: account.status,
            provider: account.provider,
            pixKey: account.pixKey,
            documentType: account.documentType,
            // nunca devolver o número do documento inteiro
            documentNumberMasked: account.documentNumber
              ? maskDocument(account.documentNumber)
              : null,
            externalAccountId: account.externalAccountId,
            createdAt: account.createdAt,
          }
        : null,
      balance,
      canWithdraw: account?.status === 'active' && balance.available > 0,
    };
  }

  // `db` pode ser o client normal ou o client de uma transação — para o cálculo
  // do saldo participar do mesmo lock do saque (ver `withdraw`).
  private async computeBalance(businessId: string, db: Prisma.TransactionClient) {
    const payments = await db.bookingPayment.findMany({
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

    const withdrawals = await db.withdrawal.findMany({
      where: { businessId, status: { in: ['pending', 'confirmed'] } },
      select: { amount: true },
    });
    const withdrawn = withdrawals.reduce((s, w) => s + Number(w.amount), 0);

    const net = round2(gross - fees);
    const available = round2(net - withdrawn);

    return {
      gross: round2(gross),
      estimatedFees: round2(fees),
      net,
      withdrawn: round2(withdrawn),
      available: available < 0 ? 0 : available,
      currency: 'BRL',
    };
  }

  /**
   * Onboarding de pagamento: registra os dados de recebimento. No modo conta
   * única de testes NÃO cria subconta real no gateway (externalAccountId fica
   * nulo) — isso é o checkpoint de produção (marketplace/OAuth). Status inicia
   * `pending_verification`, como o KYC real faria.
   */
  async createOrUpdate(businessId: string, dto: CreatePaymentAccountDto) {
    const account = await this.prisma.raw.paymentAccount.upsert({
      where: { businessId },
      create: {
        businessId,
        provider: this.provider.name,
        status: 'pending_verification',
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        pixKey: dto.pixKey,
      },
      update: {
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        pixKey: dto.pixKey,
      },
    });

    return this.get(businessId);
  }

  /**
   * Simula a conclusão do KYC (em produção quem faz isso é o webhook do
   * gateway). Disponível só para destravar o teste do fluxo de saque.
   */
  async markVerified(businessId: string) {
    const account = await this.prisma.raw.paymentAccount.findUnique({
      where: { businessId },
    });
    if (!account) {
      throw new NotFoundException('Conta de recebimento não configurada.');
    }
    await this.prisma.raw.paymentAccount.update({
      where: { businessId },
      data: { status: 'active' },
    });
    return this.get(businessId);
  }

  async withdraw(businessId: string, amount: number) {
    const account = await this.prisma.raw.paymentAccount.findUnique({
      where: { businessId },
    });
    if (!account) {
      throw new NotFoundException('Conta de recebimento não configurada.');
    }
    if (account.status !== 'active') {
      throw new BadRequestException(
        'Conta de recebimento ainda não verificada. O saque fica indisponível até a verificação ser concluída.',
      );
    }

    // Checagem de saldo + reserva do valor precisam ser ATÔMICAS (invariante
    // "money = FOR UPDATE" do projeto): travamos a conta, recalculamos o saldo
    // e gravamos o saque como `pending` dentro da mesma transação. A chamada de
    // payout ao gateway roda FORA da transação (para não segurar o lock durante
    // I/O de rede); o registro pendente já reserva o valor contra saques
    // concorrentes (computeBalance conta pending + confirmed).
    const withdrawal = await this.prisma.raw.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM payment_accounts WHERE business_id = ${businessId} FOR UPDATE
      `;
      const balance = await this.computeBalance(businessId, tx);
      if (amount > balance.available) {
        throw new BadRequestException(
          `Saldo insuficiente. Disponível: R$ ${balance.available.toFixed(2)}.`,
        );
      }
      return tx.withdrawal.create({
        data: {
          businessId,
          paymentAccountId: account.id,
          amount,
          status: 'pending',
          destination: account.pixKey ? `PIX: ${account.pixKey}` : null,
        },
      });
    });

    // Payout no gateway, fora da transação.
    let message: string | undefined;
    try {
      const result = await this.provider.createWithdrawal({
        amount,
        pixKey: account.pixKey,
        externalReference: businessId,
        sellerAccountId: account.externalAccountId,
      });
      message = result.message;
      await this.prisma.raw.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: result.status,
          gatewayTransferId: result.transferId,
          error: result.status === 'failed' ? result.message : undefined,
        },
      });
    } catch (e: any) {
      // Falha no payout: marca o saque como falho (libera o valor reservado).
      await this.prisma.raw.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'failed', error: e.message },
      });
      throw new BadRequestException('Não foi possível processar o saque agora.');
    }

    const fresh = await this.prisma.raw.withdrawal.findUnique({
      where: { id: withdrawal.id },
    });

    return {
      withdrawal: {
        id: fresh!.id,
        amount: Number(fresh!.amount),
        status: fresh!.status,
        createdAt: fresh!.createdAt,
      },
      message,
    };
  }

  async listWithdrawals(businessId: string) {
    const withdrawals = await this.prisma.raw.withdrawal.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return withdrawals.map((w) => ({
      id: w.id,
      amount: Number(w.amount),
      status: w.status,
      destination: w.destination,
      confirmedAt: w.confirmedAt,
      createdAt: w.createdAt,
    }));
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function maskDocument(doc: string): string {
  const clean = doc.replace(/\D/g, '');
  if (clean.length <= 4) return '***';
  return `***${clean.slice(-4)}`;
}
