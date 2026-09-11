import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateMembershipDto, UpdateMembershipDto } from './dto/create-membership.dto';

// Quantos dias antes do fim do ciclo enviar o aviso de "assinatura expirando".
const EXPIRY_REMINDER_DAYS = 3;

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  // --- Plans ---

  async createPlan(businessId: string, dto: CreatePlanDto) {
    if (dto.usageLimitType === 'limited' && !dto.usageLimit) {
      throw new BadRequestException('usageLimit is required for limited plans');
    }

    return this.prisma.raw.membershipPlan.create({
      data: {
        businessId,
        name: dto.name,
        price: dto.price,
        billingCycle: dto.billingCycle || 'monthly',
        usageLimitType: dto.usageLimitType,
        usageLimit: dto.usageLimitType === 'unlimited' ? null : dto.usageLimit,
        serviceIds: JSON.stringify(dto.serviceIds || []),
        active: dto.active ?? true,
      },
    });
  }

  async findAllPlans(businessId: string) {
    return this.prisma.raw.membershipPlan.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePlan(businessId: string, id: string, dto: Partial<CreatePlanDto>) {
    const plan = await this.prisma.raw.membershipPlan.findFirst({
      where: { id, businessId },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    return this.prisma.raw.membershipPlan.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.billingCycle ? { billingCycle: dto.billingCycle } : {}),
        ...(dto.usageLimitType ? { usageLimitType: dto.usageLimitType } : {}),
        ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
        ...(dto.serviceIds ? { serviceIds: JSON.stringify(dto.serviceIds) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  // --- Memberships ---

  async createMembership(businessId: string, dto: CreateMembershipDto) {
    const plan = await this.prisma.raw.membershipPlan.findFirst({
      where: { id: dto.planId, businessId, active: true },
    });
    if (!plan) throw new NotFoundException('Plan not found or inactive');

    const client = await this.prisma.raw.client.findFirst({
      where: { id: dto.clientId, businessId },
    });
    if (!client) throw new NotFoundException('Client not found');

    const cycleStart = dto.cycleStart ? new Date(dto.cycleStart) : new Date();
    const cycleEnd = this.computeCycleEnd(cycleStart, plan.billingCycle);

    return this.prisma.raw.clientMembership.create({
      data: {
        businessId,
        clientId: dto.clientId,
        planId: dto.planId,
        status: 'pending',
        cycleStart,
        cycleEnd,
      },
      include: { plan: true, client: true },
    });
  }

  async findAllMemberships(businessId: string) {
    return this.prisma.raw.clientMembership.findMany({
      where: { businessId },
      include: { plan: true, client: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateMembership(businessId: string, id: string, dto: UpdateMembershipDto) {
    const membership = await this.prisma.raw.clientMembership.findFirst({
      where: { id, businessId },
      include: { plan: true },
    });
    if (!membership) throw new NotFoundException('Membership not found');

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.paymentStatus) data.paymentStatus = dto.paymentStatus;

    // Confirmar o pagamento inicia (ou renova) o ciclo pago a partir de agora:
    // zera o uso e recalcula o fim do ciclo. Reativar um plano suspenso (só
    // status, sem novo pagamento) preserva o ciclo em andamento.
    if (dto.paymentStatus === 'paid') {
      const cycleStart = new Date();
      data.cycleStart = cycleStart;
      data.cycleEnd = this.computeCycleEnd(cycleStart, membership.plan.billingCycle);
      data.usageInCycle = 0;
    }

    return this.prisma.raw.clientMembership.update({
      where: { id },
      data,
      include: { plan: true, client: true },
    });
  }

  // --- Cliente (área "minha conta") ---

  // Planos ativos que o cliente pode assinar, já com os nomes dos serviços
  // cobertos resolvidos (lista vazia = vale para todos os serviços).
  async findActivePlansForClient(businessId: string) {
    const [plans, services] = await Promise.all([
      this.prisma.raw.membershipPlan.findMany({
        where: { businessId, active: true },
        orderBy: { price: 'asc' },
      }),
      this.prisma.raw.service.findMany({
        where: { businessId, active: true },
        select: { id: true, name: true },
      }),
    ]);
    const nameById = new Map(services.map((s) => [s.id, s.name]));
    return plans.map((p) => {
      const ids: string[] = this.parseServiceIds(p.serviceIds);
      return {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        billingCycle: p.billingCycle,
        usageLimitType: p.usageLimitType,
        usageLimit: p.usageLimit,
        services: ids
          .map((id) => ({ id, name: nameById.get(id) }))
          .filter((s): s is { id: string; name: string } => !!s.name),
      };
    });
  }

  async findClientMemberships(businessId: string, clientId: string) {
    const memberships = await this.prisma.raw.clientMembership.findMany({
      where: { businessId, clientId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    return memberships.map((m) => ({
      id: m.id,
      status: m.status,
      paymentStatus: m.paymentStatus,
      cycleStart: m.cycleStart,
      cycleEnd: m.cycleEnd,
      usageInCycle: m.usageInCycle,
      plan: {
        id: m.plan.id,
        name: m.plan.name,
        price: Number(m.plan.price),
        billingCycle: m.plan.billingCycle,
        usageLimitType: m.plan.usageLimitType,
        usageLimit: m.plan.usageLimit,
      },
    }));
  }

  // Solicitação de assinatura pelo próprio cliente: cria a matrícula em
  // `pending`/`unpaid`. A ativação continua manual pelo negócio (registrar o
  // pagamento) enquanto a cobrança online do clube não existe.
  async requestMembership(businessId: string, clientId: string, planId: string) {
    const plan = await this.prisma.raw.membershipPlan.findFirst({
      where: { id: planId, businessId, active: true },
    });
    if (!plan) throw new NotFoundException('Plano não encontrado ou inativo.');

    const existing = await this.prisma.raw.clientMembership.findFirst({
      where: {
        businessId,
        clientId,
        planId,
        status: { in: ['pending', 'active'] },
      },
    });
    if (existing) {
      throw new BadRequestException(
        existing.status === 'active'
          ? 'Você já tem este plano ativo.'
          : 'Você já solicitou este plano. Aguarde a confirmação do estabelecimento.',
      );
    }

    const cycleStart = new Date();
    const cycleEnd = this.computeCycleEnd(cycleStart, plan.billingCycle);
    return this.prisma.raw.clientMembership.create({
      data: {
        businessId,
        clientId,
        planId,
        status: 'pending',
        cycleStart,
        cycleEnd,
      },
    });
  }

  // --- Ciclo de vida (cron diário) ---
  // Enfileira o aviso de expiração e marca como `expired` o que passou do fim
  // do ciclo. Sem renovação automática: pagamento é manual (ver updateMembership).
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runLifecycle() {
    const now = new Date();

    // Aviso de expiração — janela de EXPIRY_REMINDER_DAYS antes do fim do ciclo.
    const soon = new Date(now.getTime() + EXPIRY_REMINDER_DAYS * 24 * 60 * 60 * 1000);
    const ending = await this.prisma.raw.clientMembership.findMany({
      where: { status: 'active', cycleEnd: { gte: now, lte: soon } },
      select: { id: true, businessId: true },
    });
    for (const m of ending) {
      // Dedup do envio é garantido no processor (referenceId + type único).
      await this.notifications.enqueueMembershipExpiring(m.id, m.businessId);
    }

    // Expiração — ciclos vencidos deixam de valer.
    const expired = await this.prisma.raw.clientMembership.updateMany({
      where: { status: { in: ['active', 'pending'] }, cycleEnd: { lt: now } },
      data: { status: 'expired' },
    });

    if (ending.length || expired.count) {
      this.logger.log(
        `[fidelidade] lifecycle: ${ending.length} aviso(s), ${expired.count} expirada(s)`,
      );
    }
  }

  private parseServiceIds(raw: unknown): string[] {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async checkAndApplyMembership(
    tx: Prisma.TransactionClient,
    businessId: string,
    clientId: string,
    serviceId: string,
    price: Prisma.Decimal,
  ): Promise<{ membershipId: string; discountAmount: Prisma.Decimal } | null> {
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

      // Lock and increment usage
      await tx.$queryRaw`
        SELECT id FROM client_memberships
        WHERE id = ${m.id}
        FOR UPDATE
      `;

      const fresh = await tx.clientMembership.findUnique({ where: { id: m.id } });
      if (!fresh || fresh.status !== 'active') continue;

      if (m.plan.usageLimitType === 'limited') {
        if (fresh.usageInCycle >= (m.plan.usageLimit ?? 0)) {
          continue;
        }
      }

      await tx.clientMembership.update({
        where: { id: m.id },
        data: { usageInCycle: { increment: 1 } },
      });

      return { membershipId: m.id, discountAmount: price };
    }

    return null;
  }

  private computeCycleEnd(start: Date, cycle: string): Date {
    const end = new Date(start);
    switch (cycle) {
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'quarterly':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    return end;
  }
}
