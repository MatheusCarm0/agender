import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_QUEUE } from '../queue/queue.module';
import { emailLayout, emailButton, emailInfoBox, emailText } from './email-template';

const FROM_EMAIL = 'Agender <onboarding@resend.dev>';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly resend: Resend | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only');
    }
  }

  async process(job: Job) {
    const { appointmentId, businessId, membershipId } = job.data;
    const type = job.name;

    if (type === 'campaign_send') {
      return this.processCampaignSend(job);
    }

    if (type === 'campaign_message') {
      return this.processCampaignMessage(job);
    }

    if (type === 'trial_warning') {
      return this.processTrialWarning(job);
    }

    const referenceId = appointmentId || membershipId;

    const existing = await this.prisma.raw.notificationLog.findUnique({
      where: { referenceId_type: { referenceId, type: type as any } },
    });
    if (existing?.status === 'sent') {
      this.logger.log(`Notification ${type} for ${referenceId} already sent, skipping`);
      return;
    }

    try {
      if (type === 'membership_expiring') {
        await this.processMembershipExpiring(membershipId, businessId);
      } else {
        await this.processAppointmentNotification(appointmentId, businessId, type as any);
      }
    } catch (error: any) {
      this.logger.error(`Failed to process ${type}: ${error.message}`);
      await this.prisma.raw.notificationLog.upsert({
        where: { referenceId_type: { referenceId, type: type as any } },
        create: {
          businessId,
          clientId: null,
          channel: 'email',
          type: type as any,
          status: 'failed',
          payload: job.data,
          error: error.message,
          referenceId,
        },
        update: { status: 'failed', error: error.message },
      });
      throw error;
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.resend) {
      this.logger.log(`[SIMULATED EMAIL] To: ${to} | Subject: ${subject}`);
      return true;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Resend error: ${JSON.stringify(error)}`);
        return false;
      }

      this.logger.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Resend exception: ${err.message}`);
      return false;
    }
  }

  private async processAppointmentNotification(
    appointmentId: string,
    businessId: string,
    type: 'booking_confirmation' | 'booking_cancelled' | 'booking_reminder',
  ) {
    const appointment = await this.prisma.raw.appointment.findFirst({
      where: { id: appointmentId, businessId },
      include: { client: true, professional: true, service: true, business: true },
    });
    if (!appointment) return;

    if (type === 'booking_reminder' && ['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      return;
    }

    const client = appointment.client;
    const to = client.email || client.phone;
    const businessName = appointment.business.name;
    const profName = appointment.professional.name;
    const serviceName = appointment.service.name;
    const dateStr = appointment.startAt.toLocaleString('pt-BR', { timeZone: appointment.business.timezone });

    let subject: string;
    let title: string;
    let html: string;

    const infoBox = emailInfoBox([
      { label: 'Serviço', value: serviceName },
      { label: 'Profissional', value: profName },
      { label: 'Data', value: dateStr },
    ]);

    switch (type) {
      case 'booking_confirmation':
        subject = `Agendamento confirmado - ${businessName}`;
        title = 'Agendamento confirmado';
        html = emailLayout(title, [
          emailText(`Olá <strong>${client.name}</strong>, seu agendamento foi confirmado.`),
          infoBox,
          emailText('Até lá!'),
        ].join(''), `Enviado por <strong style="color:#78716C;">${businessName}</strong> via Agender.`);
        break;
      case 'booking_cancelled':
        subject = `Agendamento cancelado - ${businessName}`;
        title = 'Agendamento cancelado';
        html = emailLayout(title, [
          emailText(`Olá <strong>${client.name}</strong>, seu agendamento foi cancelado.`),
          infoBox,
        ].join(''), `Enviado por <strong style="color:#78716C;">${businessName}</strong> via Agender.`);
        break;
      case 'booking_reminder':
        subject = `Lembrete de agendamento - ${businessName}`;
        title = 'Lembrete de agendamento';
        html = emailLayout(title, [
          emailText(`Olá <strong>${client.name}</strong>, este é um lembrete do seu agendamento.`),
          infoBox,
          emailText('Nos vemos em breve!'),
        ].join(''), `Enviado por <strong style="color:#78716C;">${businessName}</strong> via Agender.`);
        break;
    }

    const sent = client.email ? await this.sendEmail(to, subject, html) : false;

    await this.prisma.raw.notificationLog.upsert({
      where: { referenceId_type: { referenceId: appointmentId, type } },
      create: {
        businessId,
        clientId: client.id,
        channel: client.email ? 'email' : 'whatsapp',
        type,
        status: sent ? 'sent' : 'failed',
        payload: { appointmentId, to, subject },
        sentAt: sent ? new Date() : undefined,
        referenceId: appointmentId,
        error: sent ? undefined : 'No email address or send failed',
      },
      update: { status: sent ? 'sent' : 'failed', sentAt: sent ? new Date() : undefined },
    });
  }

  private async processMembershipExpiring(membershipId: string, businessId: string) {
    const membership = await this.prisma.raw.clientMembership.findFirst({
      where: { id: membershipId, businessId },
      include: { client: true, plan: true, business: true },
    });
    if (!membership) return;

    const client = membership.client;
    const to = client.email || client.phone;
    const subject = `Assinatura expirando - ${membership.business.name}`;
    const html = emailLayout('Assinatura expirando', [
      emailText(`Olá <strong>${client.name}</strong>,`),
      emailInfoBox([{ label: 'Plano', value: membership.plan.name }]),
      emailText('Sua assinatura expira em breve. Renove para continuar aproveitando os benefícios.'),
    ].join(''), `Enviado por <strong style="color:#78716C;">${membership.business.name}</strong> via Agender.`);

    const sent = client.email ? await this.sendEmail(to, subject, html) : false;

    await this.prisma.raw.notificationLog.upsert({
      where: { referenceId_type: { referenceId: membershipId, type: 'membership_expiring' } },
      create: {
        businessId,
        clientId: client.id,
        channel: client.email ? 'email' : 'whatsapp',
        type: 'membership_expiring',
        status: sent ? 'sent' : 'failed',
        payload: { membershipId, to },
        sentAt: sent ? new Date() : undefined,
        referenceId: membershipId,
      },
      update: { status: sent ? 'sent' : 'failed', sentAt: sent ? new Date() : undefined },
    });
  }

  private async processTrialWarning(job: Job) {
    const { businessId, daysLeft } = job.data;

    const business = await this.prisma.raw.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    });
    if (!business) return;

    const owner = await this.prisma.raw.user.findFirst({
      where: { businessId, role: 'owner', active: true },
      select: { email: true, name: true },
    });
    if (!owner?.email) return;

    const daysText = daysLeft === 0 ? 'hoje' : `em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`;
    const subject = `Seu período de teste expira ${daysText}`;
    const html = emailLayout(`Período de teste expira ${daysText}`, [
      emailText(`Olá <strong>${owner.name}</strong>,`),
      emailText(`O período de teste gratuito do <strong>${business.name}</strong> no Agender expira <strong>${daysText}</strong>.`),
      emailText('Para continuar usando a plataforma sem interrupções, acesse o painel e escolha um plano.'),
      emailButton('#', 'Escolher plano'),
    ].join(''));

    await this.sendEmail(owner.email, subject, html);
  }

  private async processCampaignSend(job: Job) {
    const { campaignId, businessId } = job.data;

    const campaign = await this.prisma.raw.campaign.findFirst({
      where: { id: campaignId, businessId },
      include: { business: { select: { name: true } } },
    });
    if (!campaign) return;

    await this.prisma.raw.campaign.update({
      where: { id: campaignId },
      data: { status: 'sending' },
    });

    const recipients = await this.prisma.raw.campaignRecipient.findMany({
      where: { campaignId, status: 'pending' },
      include: { client: true },
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const recipient of recipients) {
      try {
        const client = recipient.client;

        if (campaign.channel === 'email' || campaign.channel === 'both') {
          if (client.email) {
            const campaignHtml = emailLayout(
              campaign.emailSubject || campaign.name,
              emailText(`Olá <strong>${client.name}</strong>,`) + emailText(campaign.messageText),
              `Enviado por <strong style="color:#78716C;">${(campaign as any).business.name}</strong> via Agender.`,
            );
            const sent = await this.sendEmail(
              client.email,
              campaign.emailSubject || `Novidades - ${campaign.name}`,
              campaignHtml,
            );
            if (!sent) throw new Error('Email send failed');
          }
        }

        totalSent++;
        await this.prisma.raw.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'sent', sentAt: new Date() },
        });
      } catch (error: any) {
        totalFailed++;
        await this.prisma.raw.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'failed', error: error.message },
        });
      }
    }

    await this.prisma.raw.campaign.update({
      where: { id: campaignId },
      data: {
        totalSent,
        totalFailed,
        status: totalFailed === recipients.length ? 'failed' : 'sent',
      },
    });
  }

  private async processCampaignMessage(_job: Job) {
    // Individual message processing is handled in processCampaignSend batch
  }
}
