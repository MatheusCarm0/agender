import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from '../plan/plan.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { NOTIFICATION_QUEUE } from '../queue/queue.module';

const WHATSAPP_MARKETING_COST = 0.25;
const EMAIL_COST = 0.01;

@Injectable()
export class CampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PlanService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly queue: Queue,
  ) {}

  async list(businessId: string) {
    return this.prisma.raw.campaign.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(businessId: string, dto: CreateCampaignDto) {
    const filter = this.validateAudienceFilter(dto.audienceFilter ?? {});

    return this.prisma.raw.campaign.create({
      data: {
        businessId,
        name: dto.name,
        channel: dto.channel as any,
        messageText: dto.messageText,
        emailSubject: dto.emailSubject,
        audienceFilter: filter,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      },
    });
  }

  async estimate(businessId: string, campaignId: string) {
    const campaign = await this.findCampaign(businessId, campaignId);

    const recipients = await this.buildAudience(businessId, campaign.audienceFilter as any);
    const costPerSend = this.costPerSend(campaign.channel);
    const totalCost = recipients.length * costPerSend;

    const usage = await this.planService.getUsage(businessId);
    const remainingQuota = Math.max(0, usage.campaignSendsIncluded - usage.campaignSendsUsed);
    const withinQuota = Math.min(recipients.length, remainingQuota);
    const overage = Math.max(0, recipients.length - remainingQuota);

    await this.prisma.raw.campaign.update({
      where: { id: campaignId },
      data: {
        totalRecipients: recipients.length,
        costEstimate: totalCost,
      },
    });

    return {
      totalRecipients: recipients.length,
      costPerSend,
      totalCost,
      withinQuota,
      overage,
      overageCost: overage * costPerSend,
      recipients: recipients.map((c) => ({ id: c.id, name: c.name, phone: c.phone })),
    };
  }

  async confirm(businessId: string, campaignId: string) {
    const campaign = await this.findCampaign(businessId, campaignId);

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new BadRequestException('Campaign cannot be confirmed in current status');
    }

    const recipients = await this.buildAudience(businessId, campaign.audienceFilter as any);

    if (recipients.length === 0) {
      throw new BadRequestException('No eligible recipients found');
    }

    await this.prisma.raw.$transaction(async (tx) => {
      for (const client of recipients) {
        await tx.campaignRecipient.create({
          data: {
            campaignId,
            clientId: client.id,
          },
        });
      }

      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: campaign.scheduledFor ? 'scheduled' : 'sending',
          totalRecipients: recipients.length,
        },
      });
    });

    if (!campaign.scheduledFor) {
      await this.enqueueSending(campaignId, businessId);
    } else {
      const delay = new Date(campaign.scheduledFor).getTime() - Date.now();
      if (delay > 0) {
        await this.queue.add(
          'campaign_send',
          { campaignId, businessId },
          { jobId: `campaign-${campaignId}`, delay },
        );
      } else {
        await this.enqueueSending(campaignId, businessId);
      }
    }

    return { status: 'confirmed', totalRecipients: recipients.length };
  }

  async cancel(businessId: string, campaignId: string) {
    const campaign = await this.findCampaign(businessId, campaignId);

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new BadRequestException('Only draft or scheduled campaigns can be cancelled');
    }

    await this.prisma.raw.campaign.update({
      where: { id: campaignId },
      data: { status: 'cancelled' },
    });

    return { status: 'cancelled' };
  }

  async processCampaignSending(campaignId: string, businessId: string) {
    const recipients = await this.prisma.raw.campaignRecipient.findMany({
      where: { campaignId, status: 'pending' },
      include: { client: true },
    });

    const campaign = await this.prisma.raw.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) return;

    await this.prisma.raw.campaign.update({
      where: { id: campaignId },
      data: { status: 'sending' },
    });

    const costPerSend = this.costPerSend(campaign.channel);
    let totalSent = campaign.totalSent;
    let totalFailed = campaign.totalFailed;

    for (const recipient of recipients) {
      try {
        await this.queue.add(
          'campaign_message',
          {
            campaignId,
            recipientId: recipient.id,
            businessId,
            clientId: recipient.clientId,
            channel: campaign.channel,
            messageText: campaign.messageText,
            emailSubject: campaign.emailSubject,
            clientPhone: recipient.client.phone,
            clientEmail: recipient.client.email,
            clientName: recipient.client.name,
          },
          { jobId: `campaign-msg-${recipient.id}` },
        );

        totalSent++;

        await this.prisma.raw.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'sent', sentAt: new Date() },
        });

        await this.updateUsage(businessId, costPerSend);
      } catch (error) {
        totalFailed++;

        await this.prisma.raw.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    await this.prisma.raw.campaign.update({
      where: { id: campaignId },
      data: {
        totalSent,
        totalFailed,
        costActual: totalSent * costPerSend,
        status: 'sent',
      },
    });
  }

  private async enqueueSending(campaignId: string, businessId: string) {
    await this.queue.add(
      'campaign_send',
      { campaignId, businessId },
      { jobId: `campaign-${campaignId}` },
    );
  }

  private async updateUsage(businessId: string, cost: number) {
    const usage = await this.planService.getUsage(businessId);

    const newUsed = usage.campaignSendsUsed + 1;
    const isOverage = newUsed > usage.campaignSendsIncluded;

    await this.prisma.raw.planUsage.update({
      where: { id: usage.id },
      data: {
        campaignSendsUsed: newUsed,
        ...(isOverage
          ? {
              overageSends: { increment: 1 },
              overageCost: { increment: cost },
            }
          : {}),
      },
    });
  }

  private async findCampaign(businessId: string, campaignId: string) {
    const campaign = await this.prisma.raw.campaign.findFirst({
      where: { id: campaignId, businessId },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  private async buildAudience(
    businessId: string,
    filter: Record<string, any>,
  ) {
    const where: any = {
      businessId,
      marketingOptIn: true,
    };

    if (filter.inactiveSinceDays) {
      const since = new Date();
      since.setDate(since.getDate() - Number(filter.inactiveSinceDays));
      where.appointments = {
        none: { createdAt: { gte: since } },
      };
    }

    return this.prisma.raw.client.findMany({
      where,
      select: { id: true, name: true, phone: true, email: true },
    });
  }

  private validateAudienceFilter(filter: Record<string, any>): Record<string, any> {
    const allowed = ['allOptedIn', 'inactiveSinceDays'];
    const sanitized: Record<string, any> = {};

    for (const key of Object.keys(filter)) {
      if (allowed.includes(key)) {
        sanitized[key] = filter[key];
      }
    }

    return sanitized;
  }

  private costPerSend(channel: string): number {
    switch (channel) {
      case 'whatsapp':
        return WHATSAPP_MARKETING_COST;
      case 'email':
        return EMAIL_COST;
      case 'both':
        return WHATSAPP_MARKETING_COST + EMAIL_COST;
      default:
        return 0;
    }
  }
}
