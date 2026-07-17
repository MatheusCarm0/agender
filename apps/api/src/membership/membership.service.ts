import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateMembershipDto, UpdateMembershipDto } from './dto/create-membership.dto';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

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
    });
    if (!membership) throw new NotFoundException('Membership not found');

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.paymentStatus) data.paymentStatus = dto.paymentStatus;

    return this.prisma.raw.clientMembership.update({
      where: { id },
      data,
      include: { plan: true, client: true },
    });
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
