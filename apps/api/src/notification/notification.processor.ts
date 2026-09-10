import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_QUEUE } from '../queue/queue.module';
import { emailLayout, emailButton, emailInfoBox, emailText } from './email-template';
import { SmsService } from './sms/sms.service';

// Remetente padrão: sandbox do Resend, que SÓ entrega no e-mail do dono da
// conta. Para enviar a clientes, verifique um domínio em resend.com/domains e
// defina MAIL_FROM (ex.: "Agender <nao-responda@seudominio.com>").
const DEFAULT_FROM_EMAIL = 'Agender <onboarding@resend.dev>';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
  ) {
    super();
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromEmail = this.config.get<string>('MAIL_FROM') || DEFAULT_FROM_EMAIL;
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only');
    } else if (this.fromEmail === DEFAULT_FROM_EMAIL) {
      this.logger.warn(
        'MAIL_FROM não definido — usando o sandbox do Resend (onboarding@resend.dev), que só entrega no e-mail do dono da conta. Verifique um domínio e defina MAIL_FROM para enviar a clientes.',
      );
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

    if (type === 'feedback_report') {
      return this.processFeedbackReport(job);
    }

    if (type === 'password_reset') {
      return this.processPasswordReset(job);
    }

    if (type === 'client_otp') {
      return this.processClientOtp(job);
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
        from: this.fromEmail,
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

  /**
   * Variante do envio que devolve o resultado detalhado (em vez de só bool),
   * para caminhos que precisam **falhar alto** — como o OTP, onde uma entrega
   * silenciosamente falha deixa o cliente sem acessar a conta.
   */
  private async sendEmailResult(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ ok: boolean; simulated?: boolean; error?: string }> {
    if (!this.resend) {
      this.logger.log(`[SIMULATED EMAIL] To: ${to} | Subject: ${subject}`);
      return { ok: false, simulated: true };
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
      if (error) return { ok: false, error: JSON.stringify(error) };
      this.logger.log(`Email sent to ${to}: ${subject}`);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
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
    const failureReason = client.email
      ? 'Falha ao enviar o e-mail (verifique o domínio/endereço no Resend).'
      : 'Cliente sem e-mail cadastrado para notificação de agendamento.';

    await this.prisma.raw.notificationLog.upsert({
      where: { referenceId_type: { referenceId: appointmentId, type } },
      create: {
        businessId,
        clientId: client.id,
        channel: 'email',
        type,
        status: sent ? 'sent' : 'failed',
        payload: { appointmentId, to, subject },
        sentAt: sent ? new Date() : undefined,
        referenceId: appointmentId,
        error: sent ? undefined : failureReason,
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
        channel: 'email',
        type: 'membership_expiring',
        status: sent ? 'sent' : 'failed',
        payload: { membershipId, to },
        sentAt: sent ? new Date() : undefined,
        referenceId: membershipId,
      },
      update: { status: sent ? 'sent' : 'failed', sentAt: sent ? new Date() : undefined },
    });
  }

  /**
   * Entrega o código OTP de login do cliente ("meus agendamentos"). No **beta o
   * único canal é e-mail**. O SMS (Twilio) é scaffolding para uma feature
   * pós-beta: fica desligado por padrão e só é usado quando `SMS_ENABLED=true` —
   * aí vira o canal primário para o telefone de login, com e-mail como fallback.
   * Ver docs/notificacoes.md. Sem canal disponível, registramos o motivo em vez
   * de falhar em silêncio.
   */
  private async processClientOtp(job: Job) {
    const { clientId, businessId, code } = job.data;

    const client = await this.prisma.raw.client.findFirst({
      where: { id: clientId, businessId },
      include: { business: { select: { name: true } } },
    });
    if (!client) return;

    const businessName = (client as any).business?.name ?? 'Agender';

    // Pós-beta (SMS_ENABLED=true): SMS como canal primário para o telefone.
    const smsEnabled = this.config.get<string>('SMS_ENABLED') === 'true';
    if (smsEnabled && client.phone) {
      const smsBody = `${businessName}: seu código de acesso é ${code}. Expira em 5 minutos.`;
      const sent = await this.sms.send(client.phone, smsBody);
      if (sent) return;
      this.logger.warn(
        `SMS de OTP falhou para cliente ${clientId}; tentando e-mail.`,
      );
    }

    // Beta: e-mail é o único canal. Sem e-mail cadastrado, não há como entregar.
    if (!client.email) {
      this.logger.warn(
        `OTP do cliente ${clientId} não entregue: cliente sem e-mail cadastrado.`,
      );
      return;
    }

    const subject = `Seu código de acesso - ${businessName}`;
    const html = emailLayout(
      'Seu código de acesso',
      [
        emailText(
          `Olá <strong>${escapeHtml(client.name)}</strong>, use o código abaixo para acessar seus agendamentos:`,
        ),
        emailInfoBox([{ label: 'Código', value: escapeHtml(String(code)) }]),
        emailText(
          'O código expira em 5 minutos. Se você não solicitou, ignore este e-mail.',
        ),
      ].join(''),
      `Enviado por <strong style="color:#78716C;">${escapeHtml(businessName)}</strong> via Agender.`,
    );

    // Falhar alto: se o e-mail não sair de verdade (Resend não configurado ou
    // erro no envio), lançamos — o job vai para 'failed' com o motivo e pode
    // ser reprocessado, em vez de o cliente ficar sem o código em silêncio.
    const result = await this.sendEmailResult(client.email, subject, html);
    if (result.simulated) {
      throw new Error(
        `OTP não enviado para ${client.email}: RESEND_API_KEY ausente no processo (modo simulado). from=${this.fromEmail}`,
      );
    }
    if (!result.ok) {
      throw new Error(
        `OTP: Resend falhou para ${client.email} (from=${this.fromEmail}): ${result.error}`,
      );
    }
  }

  /**
   * Entrega o link de redefinição de senha do dono/membro por e-mail (Resend).
   * A validade do token (1h) é controlada no AuthService; aqui só notificamos.
   */
  private async processPasswordReset(job: Job) {
    const { email, name, resetUrl } = job.data as {
      email: string;
      name: string;
      resetUrl: string;
    };
    if (!email) return;

    const subject = 'Redefinição de senha - Agender';
    const html = emailLayout(
      'Redefinir sua senha',
      [
        emailText(
          `Olá <strong>${escapeHtml(name || '')}</strong>, recebemos um pedido para redefinir a senha da sua conta.`,
        ),
        emailButton(resetUrl, 'Criar nova senha'),
        emailText(
          'O link expira em 1 hora. Se você não solicitou, ignore este e-mail — sua senha atual continua válida.',
        ),
      ].join(''),
      'Enviado por <strong style="color:#78716C;">Agender</strong>.',
    );

    await this.sendEmail(email, subject, html);
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

  /**
   * Feedback de beta tester → e-mail para o time (FEEDBACK_EMAIL). A mensagem
   * é input livre do usuário: escapar antes de interpolar no HTML.
   */
  private async processFeedbackReport(job: Job) {
    const {
      message,
      kind,
      url,
      businessId,
      businessName,
      businessSlug,
      userName,
      userEmail,
      role,
    } = job.data;

    const to =
      this.config.get<string>('FEEDBACK_EMAIL') || 'suporte@agender.app';
    const kindLabel =
      kind === 'bug' ? 'Problema' : kind === 'idea' ? 'Ideia' : 'Outro';
    const subject = `[Feedback] ${kindLabel} — ${businessName ?? businessId}`;

    const html = emailLayout(
      `Novo feedback: ${kindLabel}`,
      [
        emailText(
          `<strong>${escapeHtml(userName ?? 'Usuário')}</strong> (${escapeHtml(userEmail ?? 'sem e-mail')}, ${escapeHtml(role ?? '—')}) enviou um feedback.`,
        ),
        emailInfoBox([
          { label: 'Negócio', value: `${businessName ?? '—'} (${businessSlug ?? businessId})` },
          { label: 'Tipo', value: kindLabel },
          ...(url ? [{ label: 'Página', value: url }] : []),
        ]),
        emailText(escapeHtml(message).replace(/\n/g, '<br />')),
      ].join(''),
    );

    await this.sendEmail(to, subject, html);
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
