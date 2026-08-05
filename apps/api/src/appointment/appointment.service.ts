import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant-context';
import { AvailabilityService } from '../availability/availability.service';
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
} from '../payment/payment-provider.interface';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly availabilityService: AvailabilityService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  private getBusinessId(): string {
    const id = this.tenantContext.getBusinessId();
    if (!id) throw new ForbiddenException('No tenant context');
    return id;
  }

  async create(dto: CreateAppointmentDto, businessId?: string) {
    const bId = businessId ?? this.getBusinessId();

    const profService = await this.prisma.raw.professionalService.findUnique({
      where: {
        professionalId_serviceId: {
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
        },
      },
      include: { service: true, professional: true },
    });
    // O vínculo é buscado pela chave global (profissional+serviço); exigir que o
    // profissional pertença a ESTE negócio impede agendar recursos de outro
    // tenant pelo slug alheio (isolamento — ver docs/00-contexto-geral.md §6).
    if (!profService || profService.professional.businessId !== bId) {
      throw new NotFoundException('Este profissional não realiza o serviço escolhido.');
    }

    const durationMin = profService.durationOverride ?? profService.service.durationMin;
    const bufferBefore = profService.service.bufferBefore;
    const bufferAfter = profService.service.bufferAfter;
    const price = profService.priceOverride ?? profService.service.price;

    const startAt = new Date(dto.startAt);
    const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);
    const blockStart = new Date(startAt.getTime() - bufferBefore * 60 * 1000);
    const blockEnd = new Date(endAt.getTime() + bufferAfter * 60 * 1000);

    return this.prisma.raw.$transaction(async (tx) => {
      if (dto.idempotencyKey) {
        const existing = await tx.appointment.findUnique({
          where: {
            businessId_idempotencyKey: {
              businessId: bId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
        });
        if (existing) return existing;
      }

      const conflicts: { id: string }[] = await tx.$queryRaw`
        SELECT id FROM appointments
        WHERE business_id = ${bId}
          AND professional_id = ${dto.professionalId}
          AND status IN ('scheduled', 'confirmed')
          AND start_at < ${blockEnd}
          AND end_at > ${blockStart}
        FOR UPDATE
      `;

      if (conflicts.length > 0) {
        throw new ConflictException('Este horário já foi reservado. Escolha outro.');
      }

      const client = await tx.client.upsert({
        where: {
          businessId_phone: {
            businessId: bId,
            phone: dto.clientPhone,
          },
        },
        create: {
          businessId: bId,
          name: dto.clientName,
          phone: dto.clientPhone,
          email: dto.clientEmail,
        },
        update: {
          name: dto.clientName,
          email: dto.clientEmail,
        },
      });

      const appointment = await tx.appointment.create({
        data: {
          businessId: bId,
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
          clientId: client.id,
          startAt,
          endAt,
          price,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      return appointment;
    });
  }

  async createWithExtras(
    dto: CreateAppointmentDto & { marketingOptIn?: boolean },
    businessId: string,
    couponCode?: string,
    authenticatedClientId?: string,
  ) {
    const profService = await this.prisma.raw.professionalService.findUnique({
      where: {
        professionalId_serviceId: {
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
        },
      },
      include: { service: true, professional: true },
    });
    // Isolamento: o profissional/serviço têm que ser DESTE negócio (o vínculo é
    // buscado por chave global). Sem isso, dá para ocupar a agenda de outro
    // tenant agendando pelo slug alheio.
    if (!profService || profService.professional.businessId !== businessId) {
      throw new NotFoundException('Este profissional não realiza o serviço escolhido.');
    }

    const durationMin = profService.durationOverride ?? profService.service.durationMin;
    const bufferBefore = profService.service.bufferBefore;
    const bufferAfter = profService.service.bufferAfter;
    const price = profService.priceOverride ?? profService.service.price;

    const startAt = new Date(dto.startAt);
    const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);
    const blockStart = new Date(startAt.getTime() - bufferBefore * 60 * 1000);
    const blockEnd = new Date(endAt.getTime() + bufferAfter * 60 * 1000);

    return this.prisma.raw.$transaction(async (tx) => {
      if (dto.idempotencyKey) {
        const existing = await tx.appointment.findUnique({
          where: {
            businessId_idempotencyKey: {
              businessId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
        });
        if (existing) return existing;
      }

      const conflicts: { id: string }[] = await tx.$queryRaw`
        SELECT id FROM appointments
        WHERE business_id = ${businessId}
          AND professional_id = ${dto.professionalId}
          AND status IN ('scheduled', 'confirmed')
          AND start_at < ${blockEnd}
          AND end_at > ${blockStart}
        FOR UPDATE
      `;

      if (conflicts.length > 0) {
        throw new ConflictException('Este horário já foi reservado. Escolha outro.');
      }

      const optInData = dto.marketingOptIn
        ? { marketingOptIn: true, marketingOptInAt: new Date() }
        : {};

      const client = await tx.client.upsert({
        where: {
          businessId_phone: {
            businessId,
            phone: dto.clientPhone,
          },
        },
        create: {
          businessId,
          name: dto.clientName,
          phone: dto.clientPhone,
          email: dto.clientEmail,
          ...optInData,
        },
        update: {
          name: dto.clientName,
          email: dto.clientEmail,
          ...(dto.marketingOptIn ? optInData : {}),
        },
      });

      let couponId: string | undefined;
      let membershipId: string | undefined;
      let discountAmount = new Prisma.Decimal(0);

      if (authenticatedClientId) {
        const membershipResult = await this.tryApplyMembership(
          tx,
          businessId,
          authenticatedClientId,
          dto.serviceId,
          price as Prisma.Decimal,
        );
        if (membershipResult) {
          membershipId = membershipResult.membershipId;
          discountAmount = membershipResult.discountAmount;
        }
      }

      if (!membershipId && couponCode) {
        const couponResult = await this.tryApplyCoupon(
          tx,
          businessId,
          couponCode,
          dto.serviceId,
          client.id,
          price as Prisma.Decimal,
        );
        if (couponResult) {
          couponId = couponResult.couponId;
          discountAmount = couponResult.discountAmount;
        }
      }

      const appointment = await tx.appointment.create({
        data: {
          businessId,
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
          clientId: client.id,
          startAt,
          endAt,
          price,
          couponId,
          membershipId,
          discountAmount,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      if (couponId) {
        await tx.couponRedemption.create({
          data: {
            couponId,
            appointmentId: appointment.id,
            clientId: client.id,
            discountApplied: discountAmount,
          },
        });
      }

      return appointment;
    });
  }

  private async tryApplyCoupon(
    tx: Prisma.TransactionClient,
    businessId: string,
    couponCode: string,
    serviceId: string,
    clientId: string,
    price: Prisma.Decimal,
  ) {
    const couponRow = await tx.coupon.findUnique({
      where: { businessId_code: { businessId, code: couponCode.toUpperCase().trim() } },
    });
    if (!couponRow) {
      throw new BadRequestException('Cupom inválido ou inativo.');
    }

    // Trava a linha do cupom antes de checar/incrementar o uso — senão dois
    // agendamentos simultâneos furam maxUses/perClientLimit (mesmo padrão do
    // membership abaixo). Re-lê o estado fresco já sob o lock.
    await tx.$queryRaw`SELECT id FROM coupons WHERE id = ${couponRow.id} FOR UPDATE`;
    const coupon = await tx.coupon.findUnique({ where: { id: couponRow.id } });

    if (!coupon || !coupon.active) {
      throw new BadRequestException('Cupom inválido ou inativo.');
    }
    if (new Date() < coupon.validFrom) {
      throw new BadRequestException('Este cupom ainda não está valendo.');
    }
    if (coupon.validUntil && new Date() > coupon.validUntil) {
      throw new BadRequestException('Cupom expirado.');
    }
    if (coupon.scope === 'service' && coupon.serviceId !== serviceId) {
      throw new BadRequestException('Este cupom não vale para o serviço escolhido.');
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Este cupom atingiu o limite de usos.');
    }

    if (coupon.perClientLimit !== null) {
      const clientRedemptions = await tx.couponRedemption.count({
        where: { couponId: coupon.id, clientId },
      });
      if (clientRedemptions >= coupon.perClientLimit) {
        throw new BadRequestException(
          'Você já usou este cupom o número máximo de vezes.',
        );
      }
    }

    let discountAmount: Prisma.Decimal;
    if (coupon.discountType === 'percent') {
      discountAmount = price.mul(coupon.discountValue).div(100);
    } else {
      discountAmount = Prisma.Decimal.min(coupon.discountValue, price);
    }

    await tx.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });

    return { couponId: coupon.id, discountAmount };
  }

  private async tryApplyMembership(
    tx: Prisma.TransactionClient,
    businessId: string,
    clientId: string,
    serviceId: string,
    price: Prisma.Decimal,
  ) {
    const now = new Date();

    const memberships = await tx.clientMembership.findMany({
      where: {
        businessId,
        clientId,
        status: 'active',
        cycleStart: { lte: now },
        cycleEnd: { gte: now },
      },
      include: { plan: true },
    });

    for (const m of memberships) {
      const serviceIds: string[] = JSON.parse(m.plan.serviceIds as string);
      if (serviceIds.length > 0 && !serviceIds.includes(serviceId)) {
        continue;
      }

      if (m.plan.usageLimitType === 'limited') {
        if (m.usageInCycle >= (m.plan.usageLimit ?? 0)) {
          continue;
        }
      }

      await tx.$queryRaw`
        SELECT id FROM client_memberships
        WHERE id = ${m.id}
        FOR UPDATE
      `;

      const fresh = await tx.clientMembership.findUnique({ where: { id: m.id } });
      if (!fresh || fresh.status !== 'active') continue;

      if (m.plan.usageLimitType === 'limited' && fresh.usageInCycle >= (m.plan.usageLimit ?? 0)) {
        continue;
      }

      await tx.clientMembership.update({
        where: { id: m.id },
        data: { usageInCycle: { increment: 1 } },
      });

      return { membershipId: m.id, discountAmount: price };
    }

    return null;
  }

  async findAll(role: string, userId: string) {
    const businessId = this.getBusinessId();

    const where: Prisma.AppointmentWhereInput = { businessId };

    if (role === 'professional') {
      const user = await this.prisma.raw.user.findUnique({
        where: { id: userId },
      });
      if (user?.professionalId) {
        where.professionalId = user.professionalId;
      }
    }

    return this.prisma.raw.appointment.findMany({
      where,
      include: {
        service: true,
        client: true,
        professional: true,
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async updateStatus(id: string, dto: UpdateAppointmentDto) {
    const businessId = this.getBusinessId();
    const appointment = await this.prisma.raw.appointment.findFirst({
      where: { id, businessId },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado.');

    const updated = await this.prisma.raw.appointment.update({
      where: { id },
      data: {
        status: dto.status as any,
        notes: dto.notes,
      },
    });

    if (dto.status === 'cancelled') {
      await this.availabilityService.invalidateCache(
        businessId,
        appointment.professionalId,
      );
      await this.refundIfPaid(id, businessId);
    }

    return updated;
  }

  /**
   * Estorna best-effort um agendamento pago que está sendo cancelado. Falha no
   * estorno não impede o cancelamento (é logada) — mas o dinheiro não pode
   * ficar retido silenciosamente num horário que não vai acontecer.
   */
  private async refundIfPaid(appointmentId: string, businessId: string) {
    const payment = await this.prisma.raw.bookingPayment.findFirst({
      where: { appointmentId, businessId, status: 'confirmed' },
    });
    if (!payment) return;

    try {
      await this.paymentProvider.refundPayment(payment.gatewayChargeId);
      await this.prisma.raw.bookingPayment.update({
        where: { id: payment.id },
        data: { status: 'refunded' },
      });
      await this.prisma.raw.appointment.update({
        where: { id: appointmentId },
        data: { paymentStatus: 'refunded' },
      });
      this.logger.log(`Estorno do agendamento ${appointmentId} solicitado.`);
    } catch (e: any) {
      this.logger.error(
        `Falha ao estornar o agendamento ${appointmentId}: ${e.message}`,
      );
    }
  }

  async updatePayment(id: string, dto: UpdatePaymentDto) {
    const businessId = this.getBusinessId();
    const appointment = await this.prisma.raw.appointment.findFirst({
      where: { id, businessId },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado.');

    return this.prisma.raw.appointment.update({
      where: { id },
      data: {
        paymentStatus: dto.paymentStatus,
        paymentMethod: dto.paymentMethod,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
      },
    });
  }
}
