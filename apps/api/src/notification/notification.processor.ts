import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_QUEUE } from '../queue/queue.module';

interface NotificationProvider {
  send(to: string, subject: string, body: string): Promise<void>;
}

class LogOnlyProvider implements NotificationProvider {
  private readonly logger = new Logger('LogOnlyProvider');

  async send(to: string, subject: string, body: string) {
    this.logger.log(`[SIMULATED] To: ${to} | Subject: ${subject} | Body: ${body}`);
  }
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly provider: NotificationProvider = new LogOnlyProvider();

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    const { appointmentId, businessId, membershipId } = job.data;
    const type = job.name as 'booking_confirmation' | 'booking_cancelled' | 'booking_reminder' | 'membership_expiring';

    const referenceId = appointmentId || membershipId;

    const existing = await this.prisma.raw.notificationLog.findUnique({
      where: { referenceId_type: { referenceId, type } },
    });
    if (existing?.status === 'sent') {
      this.logger.log(`Notification ${type} for ${referenceId} already sent, skipping`);
      return;
    }

    try {
      if (type === 'membership_expiring') {
        await this.processMembershipExpiring(membershipId, businessId);
      } else {
        await this.processAppointmentNotification(appointmentId, businessId, type);
      }
    } catch (error: any) {
      this.logger.error(`Failed to process ${type}: ${error.message}`);
      await this.prisma.raw.notificationLog.upsert({
        where: { referenceId_type: { referenceId, type } },
        create: {
          businessId,
          clientId: null,
          channel: 'email',
          type,
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
    let body: string;

    switch (type) {
      case 'booking_confirmation':
        subject = `Agendamento confirmado - ${businessName}`;
        body = `Olá ${client.name}, seu agendamento de ${serviceName} com ${profName} em ${dateStr} foi confirmado.`;
        break;
      case 'booking_cancelled':
        subject = `Agendamento cancelado - ${businessName}`;
        body = `Olá ${client.name}, seu agendamento de ${serviceName} com ${profName} em ${dateStr} foi cancelado.`;
        break;
      case 'booking_reminder':
        subject = `Lembrete de agendamento - ${businessName}`;
        body = `Olá ${client.name}, lembrete do seu agendamento de ${serviceName} com ${profName} em ${dateStr}.`;
        break;
    }

    await this.provider.send(to, subject, body);

    await this.prisma.raw.notificationLog.upsert({
      where: { referenceId_type: { referenceId: appointmentId, type } },
      create: {
        businessId,
        clientId: client.id,
        channel: client.email ? 'email' : 'whatsapp',
        type,
        status: 'sent',
        payload: { appointmentId, to, subject },
        sentAt: new Date(),
        referenceId: appointmentId,
      },
      update: { status: 'sent', sentAt: new Date() },
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

    await this.provider.send(
      to,
      `Assinatura expirando - ${membership.business.name}`,
      `Olá ${client.name}, sua assinatura do plano ${membership.plan.name} expira em breve.`,
    );

    await this.prisma.raw.notificationLog.upsert({
      where: { referenceId_type: { referenceId: membershipId, type: 'membership_expiring' } },
      create: {
        businessId,
        clientId: client.id,
        channel: client.email ? 'email' : 'whatsapp',
        type: 'membership_expiring',
        status: 'sent',
        payload: { membershipId, to },
        sentAt: new Date(),
        referenceId: membershipId,
      },
      update: { status: 'sent', sentAt: new Date() },
    });
  }
}
