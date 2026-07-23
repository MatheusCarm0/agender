import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
} from '../payment/payment-provider.interface';
import { estimateFee, estimateNet } from '../payment/fees';
import { capabilitiesFor } from '../plan/plan-limits';
import { NotificationService } from '../notification/notification.service';
import { AvailabilityService } from '../availability/availability.service';
import { CreateBookingPaymentDto } from './dto/create-booking-payment.dto';

const PIX_TTL_MINUTES = 60;
const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;
// Tempo máximo que um agendamento que exige pagamento fica reservado sem
// nenhuma cobrança confirmada antes de ser liberado (um pouco acima do TTL do PIX).
const HOLD_TTL_MS = 65 * 60 * 1000;
// Intervalo mínimo entre reconciliações com o gateway no fluxo de status
// (poll público anônimo) — evita storm de chamadas externas.
const SYNC_THROTTLE_MS = 10 * 1000;
// Agendamentos nesses status não podem receber cobrança.
const UNPAYABLE_STATUSES = ['cancelled', 'completed', 'no_show'];

@Injectable()
export class BookingPaymentService {
  private readonly logger = new Logger(BookingPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly availabilityService: AvailabilityService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /** Valor líquido a pagar num agendamento, conforme a política do negócio. */
  private amountDue(
    policy: string,
    depositPercent: number | null,
    price: Prisma.Decimal,
    discount: Prisma.Decimal,
  ): number {
    const payable = Math.max(0, Number(price) - Number(discount));
    if (policy === 'full') return round2(payable);
    if (policy === 'deposit') {
      const pct = depositPercent ?? 0;
      return round2((payable * pct) / 100);
    }
    return 0;
  }

  /**
   * Contexto de cobrança para a tela de confirmação do agendamento.
   * `required=false` → política 'none' (nada a pagar antes).
   */
  async getContext(businessId: string, appointmentId: string) {
    const appointment = await this.prisma.raw.appointment.findFirst({
      where: { id: appointmentId, businessId },
      include: { business: true, bookingPayment: true },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado.');
    if (UNPAYABLE_STATUSES.includes(appointment.status)) {
      throw new ConflictException(
        'Este agendamento não está mais ativo e não pode ser pago.',
      );
    }

    const b = appointment.business;
    const amount = this.amountDue(
      b.bookingPaymentPolicy,
      b.depositPercent,
      appointment.price,
      appointment.discountAmount,
    );

    // Plano sem pagamento online (ex.: downgrade com a política ainda setada)
    // ⇒ nunca exigir pagamento (plan/plan-limits.ts).
    const paymentsAllowed = capabilitiesFor(b.plan, b.planStatus).onlinePayments;

    return {
      required: paymentsAllowed && b.bookingPaymentPolicy !== 'none' && amount > 0,
      policy: b.bookingPaymentPolicy,
      amount,
      currency: 'BRL',
      paymentStatus: appointment.paymentStatus,
      existingPayment: appointment.bookingPayment
        ? this.toPaymentView(appointment.bookingPayment)
        : null,
    };
  }

  /**
   * Inicia a cobrança de um agendamento. Idempotente por agendamento: se já
   * existe um pagamento pendente válido, devolve o mesmo (não cria outra
   * cobrança); se confirmado, informa que já foi pago.
   */
  async initiate(
    businessId: string,
    appointmentId: string,
    dto: CreateBookingPaymentDto,
  ) {
    const appointment = await this.prisma.raw.appointment.findFirst({
      where: { id: appointmentId, businessId },
      include: { business: true, client: true, service: true, bookingPayment: true },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado.');
    if (UNPAYABLE_STATUSES.includes(appointment.status)) {
      throw new ConflictException(
        'Este agendamento não está mais ativo e não pode ser pago.',
      );
    }

    const b = appointment.business;
    const amount = this.amountDue(
      b.bookingPaymentPolicy,
      b.depositPercent,
      appointment.price,
      appointment.discountAmount,
    );

    if (
      !capabilitiesFor(b.plan, b.planStatus).onlinePayments ||
      b.bookingPaymentPolicy === 'none' ||
      amount <= 0
    ) {
      throw new BadRequestException('Este agendamento não exige pagamento.');
    }

    const existing = appointment.bookingPayment;
    if (existing) {
      if (existing.status === 'confirmed') {
        return { alreadyPaid: true, payment: this.toPaymentView(existing) };
      }
      if (
        existing.status === 'pending' &&
        (!existing.expiresAt || existing.expiresAt > new Date())
      ) {
        return { payment: this.toPaymentView(existing) };
      }
    }

    const apiUrl = this.config.get<string>('APP_URL', 'http://localhost:3001');
    const notificationUrl = `${apiUrl}/webhooks/mercadopago`;
    // Fallback de e-mail com TLD válido (o MP rejeita domínios inválidos).
    const payerEmail =
      appointment.client.email || `cliente-${appointment.client.phone}@no-reply.agender.app`;
    const document =
      dto.payerDocumentType && dto.payerDocumentNumber
        ? { type: dto.payerDocumentType, number: dto.payerDocumentNumber }
        : undefined;

    const description = `${appointment.service.name} — ${b.name}`;
    // Chave única POR TENTATIVA — nunca reutiliza a do appointment (senão o MP
    // devolveria a cobrança cacheada/expirada em vez de criar uma nova).
    const idempotencyKey = randomUUID();

    let result;
    if (dto.method === 'pix') {
      result = await this.provider.createPixPayment({
        amount,
        description,
        payer: {
          email: payerEmail,
          firstName: appointment.client.name,
          document,
        },
        externalReference: appointment.id,
        idempotencyKey,
        notificationUrl,
        expiresInMinutes: PIX_TTL_MINUTES,
      });
    } else {
      if (!dto.cardToken || !dto.paymentMethodId) {
        throw new BadRequestException(
          'Pagamento por cartão exige cardToken e paymentMethodId.',
        );
      }
      result = await this.provider.createCardPayment({
        amount,
        description,
        payer: { email: payerEmail, document },
        cardToken: dto.cardToken,
        paymentMethodId: dto.paymentMethodId,
        installments: dto.installments ?? 1,
        externalReference: appointment.id,
        idempotencyKey,
        notificationUrl,
      });
    }

    const payment = await this.prisma.raw.bookingPayment.upsert({
      where: { appointmentId: appointment.id },
      create: {
        appointmentId: appointment.id,
        businessId,
        provider: this.provider.name,
        amount,
        method: dto.method,
        status: result.status,
        gatewayChargeId: result.chargeId,
        idempotencyKey,
        pixQrCode: result.pixQrCode,
        pixQrCodeBase64: result.pixQrCodeBase64,
        checkoutUrl: result.checkoutUrl,
        expiresAt: result.expiresAt,
        paidAt: result.paidAt,
        lastSyncedAt: new Date(),
      },
      update: {
        method: dto.method,
        status: result.status,
        gatewayChargeId: result.chargeId,
        idempotencyKey,
        pixQrCode: result.pixQrCode,
        pixQrCodeBase64: result.pixQrCodeBase64,
        checkoutUrl: result.checkoutUrl,
        expiresAt: result.expiresAt,
        paidAt: result.paidAt,
        lastSyncedAt: new Date(),
      },
    });

    // Cartão pode ser aprovado na hora.
    if (result.status === 'confirmed') {
      await this.applyConfirmation(payment.id);
      const fresh = await this.prisma.raw.bookingPayment.findUnique({
        where: { id: payment.id },
      });
      return { payment: this.toPaymentView(fresh!) };
    }

    return { payment: this.toPaymentView(payment) };
  }

  /** Consulta status; se pendente, reconcilia com o gateway (fallback dev). */
  async getStatus(businessId: string, appointmentId: string) {
    const payment = await this.prisma.raw.bookingPayment.findFirst({
      where: { appointmentId, businessId },
    });
    if (!payment) throw new NotFoundException('Pagamento não encontrado.');

    // Throttle: o endpoint de status é público e chamado em poll (~4s). A fonte
    // primária da confirmação é o webhook; aqui só reconciliamos com o gateway
    // no máximo a cada SYNC_THROTTLE_MS, para não gerar storm de chamadas ao MP.
    const staleEnough =
      !payment.lastSyncedAt ||
      Date.now() - payment.lastSyncedAt.getTime() > SYNC_THROTTLE_MS;

    if (payment.status === 'pending' && staleEnough) {
      try {
        const remote = await this.provider.getPayment(payment.gatewayChargeId);
        if (remote.status === 'confirmed') {
          await this.applyConfirmation(payment.id);
        } else {
          await this.prisma.raw.bookingPayment.update({
            where: { id: payment.id },
            data: {
              lastSyncedAt: new Date(),
              ...(remote.status !== 'pending' ? { status: remote.status } : {}),
            },
          });
        }
      } catch (e: any) {
        this.logger.warn(`Falha ao sincronizar pagamento: ${e.message}`);
      }
    }

    const fresh = await this.prisma.raw.bookingPayment.findUnique({
      where: { id: payment.id },
    });
    return this.toPaymentView(fresh!);
  }

  /** Caminho do webhook: correlaciona pela cobrança do gateway. */
  async handleWebhookPayment(gatewayChargeId: string) {
    const payment = await this.prisma.raw.bookingPayment.findFirst({
      where: { gatewayChargeId },
    });
    if (!payment) {
      this.logger.warn(
        `Webhook de pagamento ${gatewayChargeId} sem BookingPayment local.`,
      );
      return;
    }

    const remote = await this.provider.getPayment(gatewayChargeId);
    if (remote.status === 'confirmed') {
      await this.applyConfirmation(payment.id);
    } else if (remote.status !== 'pending') {
      await this.prisma.raw.bookingPayment.update({
        where: { id: payment.id },
        data: { status: remote.status },
      });
    }
  }

  /**
   * Confirma o pagamento: marca pago, atualiza o agendamento e dispara a
   * confirmação/lembrete. Idempotente — reentrega de webhook não duplica.
   */
  private async applyConfirmation(bookingPaymentId: string) {
    const payment = await this.prisma.raw.bookingPayment.findUnique({
      where: { id: bookingPaymentId },
      include: { appointment: true },
    });
    if (!payment) return;
    // Idempotência baseada no AGENDAMENTO: se já está pago, os efeitos colaterais
    // (notificação, lembrete) já rodaram. Não checamos o status do BookingPayment
    // porque o cartão aprovado na hora já é gravado como 'confirmed' no upsert —
    // checar por ele pularia a atualização do agendamento.
    if (payment.appointment.paymentStatus === 'paid') return;

    await this.prisma.raw.bookingPayment.update({
      where: { id: payment.id },
      data: { status: 'confirmed', paidAt: new Date() },
    });

    await this.prisma.raw.appointment.update({
      where: { id: payment.appointmentId },
      data: {
        paymentStatus: 'paid',
        paymentMethod: payment.method,
        paidAt: new Date(),
      },
    });

    // Só agora — pagamento confirmado — dispara confirmação e lembrete.
    await this.notificationService.enqueueBookingConfirmation(
      payment.appointmentId,
      payment.businessId,
    );
    const timeUntil =
      new Date(payment.appointment.startAt).getTime() - Date.now();
    if (timeUntil > REMINDER_LEAD_MS) {
      await this.notificationService.enqueueBookingReminder(
        payment.appointmentId,
        payment.businessId,
        timeUntil - REMINDER_LEAD_MS,
      );
    }

    this.logger.log(
      `Pagamento confirmado do agendamento ${payment.appointmentId}.`,
    );
  }

  /**
   * Libera slots de agendamentos com pagamento pendente vencido: cancela o
   * agendamento e invalida o cache de disponibilidade. Não deixa reserva não
   * paga travar horário indefinidamente (ver docs/pagamentos.md).
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStalePayments() {
    const now = new Date();
    const stale = await this.prisma.raw.bookingPayment.findMany({
      where: { status: 'pending', expiresAt: { lt: now } },
      include: { appointment: true },
    });

    for (const payment of stale) {
      await this.prisma.raw.bookingPayment.update({
        where: { id: payment.id },
        data: { status: 'expired' },
      });

      // Só cancela o agendamento se ainda estiver não pago e ativo.
      if (
        payment.appointment.paymentStatus !== 'paid' &&
        ['scheduled', 'confirmed'].includes(payment.appointment.status)
      ) {
        await this.prisma.raw.appointment.update({
          where: { id: payment.appointmentId },
          data: { status: 'cancelled' },
        });
        await this.availabilityService.invalidateCache(
          payment.businessId,
          payment.appointment.professionalId,
        );
        this.logger.log(
          `Agendamento ${payment.appointmentId} cancelado por pagamento expirado.`,
        );
      }
    }

    await this.expireUninitiatedHolds();
  }

  /**
   * Cancela agendamentos que EXIGEM pagamento mas ficaram reservados sem
   * nenhuma cobrança confirmada dentro do prazo — inclusive quando o cliente
   * nunca chegou a iniciar o pagamento (não há BookingPayment). Sem isso, um
   * agendamento não pago prenderia o slot indefinidamente.
   */
  private async expireUninitiatedHolds() {
    const cutoff = new Date(Date.now() - HOLD_TTL_MS);
    const held = await this.prisma.raw.appointment.findMany({
      where: {
        status: 'scheduled',
        paymentStatus: 'unpaid',
        createdAt: { lt: cutoff },
        business: { bookingPaymentPolicy: { not: 'none' } },
      },
      include: { bookingPayment: true },
    });

    for (const appt of held) {
      if (appt.bookingPayment?.status === 'confirmed') continue;

      await this.prisma.raw.appointment.update({
        where: { id: appt.id },
        data: { status: 'cancelled' },
      });
      if (appt.bookingPayment && appt.bookingPayment.status === 'pending') {
        await this.prisma.raw.bookingPayment.update({
          where: { id: appt.bookingPayment.id },
          data: { status: 'expired' },
        });
      }
      await this.availabilityService.invalidateCache(
        appt.businessId,
        appt.professionalId,
      );
      this.logger.log(
        `Agendamento ${appt.id} cancelado: reserva não paga expirada.`,
      );
    }
  }

  private toPaymentView(p: {
    id: string;
    amount: Prisma.Decimal;
    method: string;
    status: string;
    pixQrCode: string | null;
    pixQrCodeBase64: string | null;
    checkoutUrl: string | null;
    expiresAt: Date | null;
  }) {
    const amount = Number(p.amount);
    return {
      id: p.id,
      amount,
      method: p.method,
      status: p.status,
      pixQrCode: p.pixQrCode,
      pixQrCodeBase64: p.pixQrCodeBase64,
      checkoutUrl: p.checkoutUrl,
      expiresAt: p.expiresAt,
      estimatedFee: estimateFee(amount, p.method),
      estimatedNet: estimateNet(amount, p.method),
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
