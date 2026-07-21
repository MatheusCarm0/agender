import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

const PLAN_QUOTAS: Record<string, number> = {
  basico: 0,
  profissional: 300,
  pro: 1000,
};

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async getBusinessPlan(businessId: string) {
    const business = await this.prisma.raw.business.findUnique({
      where: { id: businessId },
      select: {
        plan: true,
        planStatus: true,
        trialEndsAt: true,
        planUpdatedAt: true,
      },
    });
    return business;
  }

  async activatePlan(businessId: string, plan: string) {
    const business = await this.prisma.raw.business.update({
      where: { id: businessId },
      data: {
        plan: plan as any,
        planStatus: 'active',
        planUpdatedAt: new Date(),
      },
    });
    return {
      plan: business.plan,
      planStatus: business.planStatus,
      planUpdatedAt: business.planUpdatedAt,
    };
  }

  async getUsage(businessId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    let usage = await this.prisma.raw.planUsage.findUnique({
      where: { businessId_periodStart: { businessId, periodStart } },
    });

    if (!usage) {
      const business = await this.prisma.raw.business.findUnique({
        where: { id: businessId },
        select: { plan: true },
      });

      const quota = PLAN_QUOTAS[business?.plan ?? 'basico'] ?? 0;

      usage = await this.prisma.raw.planUsage.create({
        data: {
          businessId,
          periodStart,
          periodEnd,
          planAtSnapshot: (business?.plan as any) ?? 'basico',
          campaignSendsIncluded: quota,
        },
      });
    }

    return usage;
  }

  getQuotaForPlan(plan: string): number {
    return PLAN_QUOTAS[plan] ?? 0;
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleTrialExpiration() {
    this.logger.log('Checking for expired trials...');

    const now = new Date();

    const expiredBusinesses = await this.prisma.raw.business.findMany({
      where: {
        planStatus: 'trialing',
        trialEndsAt: { lt: now },
      },
      select: { id: true, name: true },
    });

    for (const business of expiredBusinesses) {
      await this.prisma.raw.business.update({
        where: { id: business.id },
        data: { planStatus: 'expired' },
      });
      this.logger.log(`Trial expired for business ${business.id} (${business.name})`);
    }

    if (expiredBusinesses.length > 0) {
      this.logger.log(`Expired ${expiredBusinesses.length} trial(s)`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleTrialWarnings() {
    const now = new Date();

    const d3 = new Date(now);
    d3.setDate(d3.getDate() + 3);
    const d1 = new Date(now);
    d1.setDate(d1.getDate() + 1);

    const warningBusinesses = await this.prisma.raw.business.findMany({
      where: {
        planStatus: 'trialing',
        trialEndsAt: { gte: now },
      },
      select: { id: true, trialEndsAt: true },
    });

    for (const business of warningBusinesses) {
      const daysLeft = Math.ceil(
        (business.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysLeft === 3 || daysLeft === 1 || daysLeft === 0) {
        this.logger.log(
          `Trial warning D-${daysLeft} for business ${business.id}`,
        );
        await this.notificationService.enqueueTrialWarning(business.id, daysLeft);
      }
    }
  }
}
